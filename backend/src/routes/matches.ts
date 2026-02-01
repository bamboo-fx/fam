import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getPatientsCollection, getMatchesCollection } from "../services/mongodb";
import { getAllTrials, ingestTrials, ingestTrialsWithProgress, clearTrials } from "../services/firecrawl";
import type { FirecrawlProgressEvent } from "../services/firecrawl";
import { matchPatientToTrials, matchPatientToTrialsWithProgress } from "../services/openai";
import type { MatchingProgressEvent } from "../services/openai";
import { sendMatchNotification } from "../services/resend";
import type { PatientProfile, MatchResult, MatchResultDocument, ExtractedPatientData } from "../types";
import { getScoreColor } from "../types";

const matchesRouter = new Hono();

// ============================================
// POST /api/matches/stream
// Run matching with SSE progress updates
// ============================================
const runMatchRequestSchema = z.object({
  patientId: z.string().min(1, "Patient ID is required"),
});

matchesRouter.post("/stream", zValidator("json", runMatchRequestSchema), async (c) => {
  const { patientId } = c.req.valid("json");

  return streamSSE(c, async (stream) => {
    try {
      // Helper to send SSE events
      const sendEvent = async (event: string, data: Record<string, unknown>) => {
        console.log(`[Matches API] SSE event: ${event}`, JSON.stringify(data));
        await stream.writeSSE({ data: JSON.stringify(data), event });
      };

      // Step 0: Get patient
      await sendEvent("progress", { step: 0, message: "Loading patient profile..." });
      const patientsCollection = await getPatientsCollection();
      const patientDoc = await patientsCollection.findOne({ _id: patientId });

      if (!patientDoc) {
        await stream.writeSSE({ data: JSON.stringify({ error: "Patient not found" }), event: "error" });
        return;
      }

      const patient: PatientProfile = {
        id: patientDoc._id,
        age: patientDoc.age,
        ageRange: (patientDoc as any).ageRange, // Use age range from document extraction
        gender: patientDoc.gender,
        smokingStatus: patientDoc.smokingStatus,
        state: patientDoc.state,
        email: patientDoc.email,
        conditions: patientDoc.conditions || [],
        createdAt: patientDoc.createdAt,
      };

      const extractedData: ExtractedPatientData | undefined = (patientDoc as any).extractedData;
      const aiParsedConditions: string[] | undefined = (patientDoc as any).aiParsedConditions;

      // Combine all conditions from different sources - prioritize LLM-analyzed search terms
      // aiParsedConditions contains the LLM-optimized search terms from document analysis
      const allConditions: string[] = [
        // First: LLM-analyzed search terms (optimized for ClinicalTrials.gov)
        ...(aiParsedConditions || []),
        // Second: Primary diagnosis from LLM analysis
        ...((patientDoc as any).primaryDiagnosis ? [(patientDoc as any).primaryDiagnosis] : []),
        // Third: Patient conditions from form input
        ...(patient.conditions || []),
        // Fourth: Raw extracted conditions from document (fallback)
        ...(extractedData?.medicalConditions || []),
        ...(extractedData?.cancerType ? [extractedData.cancerType] : []),
      ].filter(Boolean);

      // Remove duplicates while preserving priority order
      const uniqueConditions = [...new Set(allConditions)];

      console.log(`[Matches API] Patient conditions: ${uniqueConditions.join(", ") || "none specified"}`);

      // Step 1: Always scrape fresh trials based on patient's conditions
      console.log("[Matches API] Scraping trials for patient's specific conditions...");

      const firecrawlProgress = async (event: FirecrawlProgressEvent) => {
        await sendEvent(event.type, event.data);
      };

      // Pass patient conditions to the scraper
      const ingested = await ingestTrialsWithProgress(firecrawlProgress, uniqueConditions);
      let trials = ingested.trials;

      if (trials.length === 0) {
        await stream.writeSSE({ data: JSON.stringify({ error: "No trials found for your conditions" }), event: "error" });
        return;
      }

      // Step 2: AI Matching with progress
      console.log(`[Matches API] Starting AI matching against ${trials.length} trials`);

      if (extractedData) {
        console.log(`[Matches API] Using extractedData from patient document`);
      }
      if (aiParsedConditions && aiParsedConditions.length > 0) {
        console.log(`[Matches API] Using ${aiParsedConditions.length} AI-parsed conditions`);
      }

      const matchingProgress = async (event: MatchingProgressEvent) => {
        await sendEvent(event.type, event.data);
      };

      const matchResults = await matchPatientToTrialsWithProgress(
        patient,
        trials,
        matchingProgress,
        extractedData,
        aiParsedConditions
      );

      // Store match results - only save matches with score >= 40 (at least "Possible match")
      const matchesCollection = await getMatchesCollection();
      const validMatches = matchResults.filter((m) => m.confidenceScore >= 40);

      if (validMatches.length > 0) {
        await matchesCollection.deleteMany({ patientId });
        const documents: MatchResultDocument[] = validMatches.map((m) => ({
          _id: m.id,
          patientId: m.patientId,
          trialId: m.trialId,
          confidenceScore: m.confidenceScore,
          reasoning: m.reasoning,
          createdAt: m.createdAt,
        }));
        await matchesCollection.insertMany(documents);
        console.log(`[Matches API] Stored ${documents.length} match results`);
      }

      // Step 3: Send notification
      await sendEvent("progress", { step: 3, message: "Sending email notification..." });
      const resultsUrl = `${process.env.VITE_BASE_URL || "http://localhost:8000"}/results/${patientId}`;
      const emailResult = await sendMatchNotification(patient.email, validMatches.length, resultsUrl);

      if (emailResult.success) {
        console.log(`[Matches API] Notification email sent to ${patient.email}`);
      }

      // Done - include scoreColor for each match
      const matchesWithColor = validMatches.map((m) => ({
        ...m,
        scoreColor: getScoreColor(m.confidenceScore),
      }));
      await stream.writeSSE({
        data: JSON.stringify({ matchCount: validMatches.length, matches: matchesWithColor }),
        event: "complete",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("[Matches API] Matching failed:", message);
      await stream.writeSSE({ data: JSON.stringify({ error: message }), event: "error" });
    }
  });
});

// ============================================
// POST /api/matches (non-streaming fallback)
// Run matching for a patient
// ============================================
matchesRouter.post("/", zValidator("json", runMatchRequestSchema), async (c) => {
  try {
    const { patientId } = c.req.valid("json");
    console.log(`[Matches API] Running matching for patient: ${patientId}`);

    // Get patient from MongoDB
    const patientsCollection = await getPatientsCollection();
    const patientDoc = await patientsCollection.findOne({ _id: patientId });

    if (!patientDoc) {
      return c.json(
        {
          error: {
            message: `Patient not found: ${patientId}`,
            code: "PATIENT_NOT_FOUND",
          },
        },
        404
      );
    }

    // Convert to PatientProfile
    const patient: PatientProfile = {
      id: patientDoc._id,
      age: patientDoc.age,
      ageRange: (patientDoc as any).ageRange, // Use age range from document extraction
      gender: patientDoc.gender,
      smokingStatus: patientDoc.smokingStatus,
      state: patientDoc.state,
      email: patientDoc.email,
      conditions: patientDoc.conditions || [],
      createdAt: patientDoc.createdAt,
    };

    // Get extractedData and aiParsedConditions from the patient document
    const extractedData: ExtractedPatientData | undefined = (patientDoc as any).extractedData;
    const aiParsedConditions: string[] | undefined = (patientDoc as any).aiParsedConditions;

    // Get all trials from MongoDB (or ingest if empty)
    let trials = await getAllTrials();
    if (trials.length === 0) {
      console.log(`[Matches API] No trials found, ingesting...`);
      const ingested = await ingestTrials();
      trials = ingested.trials;
    }

    if (trials.length === 0) {
      return c.json(
        {
          error: {
            message: "No trials available for matching. Please ingest trials first.",
            code: "NO_TRIALS",
          },
        },
        400
      );
    }

    console.log(`[Matches API] Matching patient against ${trials.length} trials`);
    if (extractedData) {
      console.log(`[Matches API] Using extractedData from patient document`);
    }
    if (aiParsedConditions && aiParsedConditions.length > 0) {
      console.log(`[Matches API] Using ${aiParsedConditions.length} AI-parsed conditions: ${aiParsedConditions.join(", ")}`);
    }

    // Call matchPatientToTrials from openai.ts with extractedData and aiParsedConditions
    const matchResults = await matchPatientToTrials(patient, trials, extractedData, aiParsedConditions);

    // Store match results in MongoDB
    const matchesCollection = await getMatchesCollection();

    // Filter to only store matches with score >= 40 (at least "Possible match")
    const validMatches = matchResults.filter((m) => m.confidenceScore >= 40);

    if (validMatches.length > 0) {
      // Delete existing matches for this patient
      await matchesCollection.deleteMany({ patientId });

      // Insert new matches
      const documents: MatchResultDocument[] = validMatches.map((m) => ({
        _id: m.id,
        patientId: m.patientId,
        trialId: m.trialId,
        confidenceScore: m.confidenceScore,
        reasoning: m.reasoning,
        createdAt: m.createdAt,
      }));

      await matchesCollection.insertMany(documents);
      console.log(`[Matches API] Stored ${documents.length} match results`);
    }

    // Send notification email via Resend
    const resultsUrl = `${process.env.VITE_BASE_URL || "http://localhost:8000"}/results/${patientId}`;
    const emailResult = await sendMatchNotification(
      patient.email,
      validMatches.length,
      resultsUrl
    );

    if (emailResult.success) {
      console.log(`[Matches API] Notification email sent to ${patient.email}`);
    } else {
      console.warn(`[Matches API] Failed to send notification email to ${patient.email}`);
    }

    // Include scoreColor for each match
    const matchesWithColor = validMatches.map((m) => ({
      ...m,
      scoreColor: getScoreColor(m.confidenceScore),
    }));

    return c.json({
      data: {
        matchCount: validMatches.length,
        matches: matchesWithColor,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Matches API] Matching failed:", message);
    return c.json(
      {
        error: {
          message: `Failed to run matching: ${message}`,
          code: "MATCHING_FAILED",
        },
      },
      500
    );
  }
});

// ============================================
// GET /api/matches/:patientId
// Get match results for a patient
// ============================================
const patientIdParamSchema = z.object({
  patientId: z.string().min(1, "Patient ID is required"),
});

matchesRouter.get("/:patientId", zValidator("param", patientIdParamSchema), async (c) => {
  try {
    const { patientId } = c.req.valid("param");
    console.log(`[Matches API] Fetching matches for patient: ${patientId}`);

    // Fetch patient data for email composition
    const patientsCollection = await getPatientsCollection();
    const patientDoc = await patientsCollection.findOne({ _id: patientId });

    const matchesCollection = await getMatchesCollection();
    const documents = await matchesCollection
      .find({ patientId })
      .sort({ confidenceScore: -1 })
      .toArray();

    // Get all trials to join with matches
    const trials = await getAllTrials();
    const trialsMap = new Map(trials.map((t) => [t.nctId, t]));

    // Convert documents to MatchResult with trial data and color category
    const matchesWithTrials = documents.map((doc) => {
      const trial = trialsMap.get(doc.trialId);
      return {
        id: doc._id,
        patientId: doc.patientId,
        trialId: doc.trialId,
        confidenceScore: doc.confidenceScore,
        scoreColor: getScoreColor(doc.confidenceScore),
        reasoning: doc.reasoning,
        createdAt: doc.createdAt,
        trial: trial || null,
      };
    }).filter((m) => m.trial !== null); // Only include matches with valid trials

    // Include patient data for email composition (only safe fields)
    const patient = patientDoc ? {
      email: patientDoc.email,
      conditions: patientDoc.conditions || [],
      aiParsedConditions: (patientDoc as any).aiParsedConditions || [],
    } : undefined;

    return c.json({ data: { matches: matchesWithTrials, patient } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Matches API] Failed to fetch matches:", message);
    return c.json(
      {
        error: {
          message: `Failed to fetch matches: ${message}`,
          code: "FETCH_FAILED",
        },
      },
      500
    );
  }
});

export { matchesRouter };
