import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { CreatePatientSchema, ParseConditionsRequestSchema, type PatientProfile, type ExtractedPatientData, type CreatePatientInput } from "../types";
import { getPatientsCollection } from "../services/mongodb";
import { processDocument } from "../services/reducto";
import { parseConditionsFromText, analyzeExtractedDocumentData } from "../services/openai";

const patientsRouter = new Hono();

/**
 * POST /api/patients - Submit a new patient profile
 *
 * Accepts either JSON body or multipart/form-data with optional document upload.
 * If a document is provided, it's processed with Reducto to extract medical data.
 */
patientsRouter.post("/", async (c) => {
  try {
    const contentType = c.req.header("content-type") || "";

    let patientData: CreatePatientInput;
    let extractedData: ExtractedPatientData | undefined;

    if (contentType.includes("multipart/form-data")) {
      // Handle multipart/form-data (with optional document upload)
      const formData = await c.req.formData();

      // Extract patient fields from form data
      const ageStr = formData.get("age")?.toString();
      const gender = formData.get("gender")?.toString();
      const smokingStatus = formData.get("smokingStatus")?.toString();
      const state = formData.get("state")?.toString();
      const email = formData.get("email")?.toString();
      const conditionsStr = formData.get("conditions")?.toString();
      const conditionDescription = formData.get("conditionDescription")?.toString();
      const performanceStatus = formData.get("performanceStatus")?.toString();

      // New demographic fields
      const dateOfBirth = formData.get("dateOfBirth")?.toString();
      const sexAtBirth = formData.get("sexAtBirth")?.toString();
      const race = formData.get("race")?.toString();
      const ethnicity = formData.get("ethnicity")?.toString();

      // New medical history fields
      const primaryDiagnosis = formData.get("primaryDiagnosis")?.toString();
      const currentMedicationsStr = formData.get("currentMedications")?.toString();
      const knownAllergiesStr = formData.get("knownAllergies")?.toString();
      const drugAllergiesStr = formData.get("drugAllergies")?.toString();
      const pregnancyStatus = formData.get("pregnancyStatus")?.toString();

      // New health status fields
      const generalHealthRating = formData.get("generalHealthRating")?.toString();
      const organFunctionIssuesStr = formData.get("organFunctionIssues")?.toString();
      const majorOperationsStr = formData.get("majorOperations")?.toString();
      const heightCmStr = formData.get("heightCm")?.toString();
      const weightKgStr = formData.get("weightKg")?.toString();

      // Use sexAtBirth as gender if gender not provided
      const effectiveGender = gender || sexAtBirth;

      // Calculate age from dateOfBirth if age not provided
      let effectiveAge: number | undefined;
      if (ageStr) {
        effectiveAge = parseInt(ageStr, 10);
      } else if (dateOfBirth) {
        const dob = new Date(dateOfBirth);
        const today = new Date();
        effectiveAge = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
          effectiveAge--;
        }
      }

      if (!effectiveAge || !effectiveGender || !smokingStatus || !state || !email) {
        const missingFields: string[] = [];
        if (!effectiveAge) missingFields.push("age or date of birth");
        if (!effectiveGender) missingFields.push("sex at birth");
        if (!smokingStatus) missingFields.push("smoking status");
        if (!state) missingFields.push("state");
        if (!email) missingFields.push("email");
        return c.json(
          { error: { message: `Missing required fields: ${missingFields.join(", ")}`, code: "VALIDATION_ERROR" } },
          400
        );
      }

      // Parse age as number
      const age = effectiveAge;
      if (isNaN(age)) {
        return c.json(
          { error: { message: "Age must be a valid number", code: "VALIDATION_ERROR" } },
          400
        );
      }

      // Parse conditions - either JSON array or comma-separated string
      let conditions: string[] = [];
      if (conditionsStr) {
        try {
          conditions = JSON.parse(conditionsStr);
        } catch {
          // If not valid JSON, treat as comma-separated
          conditions = conditionsStr.split(",").map(s => s.trim()).filter(Boolean);
        }
      }

      // Parse array fields - either JSON array or comma-separated string
      const parseArrayField = (value: string | undefined): string[] | undefined => {
        if (!value) return undefined;
        try {
          return JSON.parse(value);
        } catch {
          return value.split(",").map(s => s.trim()).filter(Boolean);
        }
      };

      const currentMedications = parseArrayField(currentMedicationsStr);
      const knownAllergies = parseArrayField(knownAllergiesStr);
      const drugAllergies = parseArrayField(drugAllergiesStr);
      const organFunctionIssues = parseArrayField(organFunctionIssuesStr);
      const majorOperations = parseArrayField(majorOperationsStr);

      // Parse numeric fields
      const heightCm = heightCmStr ? parseFloat(heightCmStr) : undefined;
      const weightKg = weightKgStr ? parseFloat(weightKgStr) : undefined;

      const rawPatientData = {
        age,
        gender: effectiveGender,
        smokingStatus,
        state,
        email,
        conditions,
        ...(conditionDescription && { conditionDescription }),
        ...(performanceStatus && { performanceStatus }),
        // Demographics
        ...(dateOfBirth && { dateOfBirth }),
        ...(sexAtBirth && { sexAtBirth }),
        ...(race && { race }),
        ...(ethnicity && { ethnicity }),
        // Medical History
        ...(primaryDiagnosis && { primaryDiagnosis }),
        ...(currentMedications && { currentMedications }),
        ...(knownAllergies && { knownAllergies }),
        ...(drugAllergies && { drugAllergies }),
        ...(pregnancyStatus && { pregnancyStatus }),
        // Health Status
        ...(generalHealthRating && { generalHealthRating }),
        ...(organFunctionIssues && { organFunctionIssues }),
        ...(majorOperations && { majorOperations }),
        ...(heightCm !== undefined && !isNaN(heightCm) && { heightCm }),
        ...(weightKg !== undefined && !isNaN(weightKg) && { weightKg }),
      };

      // Validate with Zod schema
      const parseResult = CreatePatientSchema.safeParse(rawPatientData);
      if (!parseResult.success) {
        const errorMessage = parseResult.error.issues[0]?.message || "Validation failed";
        return c.json(
          { error: { message: errorMessage, code: "VALIDATION_ERROR" } },
          400
        );
      }
      patientData = parseResult.data;

      // Process document if provided
      const document = formData.get("document");
      if (document && document instanceof File) {
        const fileBuffer = Buffer.from(await document.arrayBuffer());
        extractedData = await processDocument(fileBuffer, document.name);
      }
    } else {
      // Handle JSON body
      const body = await c.req.json();
      const parseResult = CreatePatientSchema.safeParse(body);

      if (!parseResult.success) {
        const errorMessage = parseResult.error.issues[0]?.message || "Validation failed";
        return c.json(
          { error: { message: errorMessage, code: "VALIDATION_ERROR" } },
          400
        );
      }

      patientData = parseResult.data;
    }

    const now = new Date();
    const collection = await getPatientsCollection();

    // Use findOneAndUpdate with upsert to create or update patient by email
    const result = await collection.findOneAndUpdate(
      { email: patientData.email },
      {
        $set: {
          age: patientData.age,
          gender: patientData.gender,
          smokingStatus: patientData.smokingStatus,
          state: patientData.state,
          conditions: patientData.conditions,
          updatedAt: now,
          ...(extractedData && { extractedData }),
          ...(patientData.conditionDescription !== undefined && { conditionDescription: patientData.conditionDescription }),
          ...(patientData.performanceStatus !== undefined && { performanceStatus: patientData.performanceStatus }),
          // Demographics
          ...(patientData.dateOfBirth !== undefined && { dateOfBirth: patientData.dateOfBirth }),
          ...(patientData.sexAtBirth !== undefined && { sexAtBirth: patientData.sexAtBirth }),
          ...(patientData.race !== undefined && { race: patientData.race }),
          ...(patientData.ethnicity !== undefined && { ethnicity: patientData.ethnicity }),
          // Medical History
          ...(patientData.primaryDiagnosis !== undefined && { primaryDiagnosis: patientData.primaryDiagnosis }),
          ...(patientData.currentMedications !== undefined && { currentMedications: patientData.currentMedications }),
          ...(patientData.knownAllergies !== undefined && { knownAllergies: patientData.knownAllergies }),
          ...(patientData.drugAllergies !== undefined && { drugAllergies: patientData.drugAllergies }),
          ...(patientData.pregnancyStatus !== undefined && { pregnancyStatus: patientData.pregnancyStatus }),
          // Health Status
          ...(patientData.generalHealthRating !== undefined && { generalHealthRating: patientData.generalHealthRating }),
          ...(patientData.organFunctionIssues !== undefined && { organFunctionIssues: patientData.organFunctionIssues }),
          ...(patientData.majorOperations !== undefined && { majorOperations: patientData.majorOperations }),
          ...(patientData.heightCm !== undefined && { heightCm: patientData.heightCm }),
          ...(patientData.weightKg !== undefined && { weightKg: patientData.weightKg }),
        },
        $setOnInsert: {
          _id: crypto.randomUUID(),
          email: patientData.email,
          createdAt: now,
        },
      },
      { upsert: true, returnDocument: "after" }
    );

    const patient = result;
    if (!patient) {
      return c.json(
        { error: { message: "Failed to create or update patient", code: "INTERNAL_ERROR" } },
        500
      );
    }

    const isNew = patient.createdAt?.getTime() === patient.updatedAt?.getTime();
    console.log(`[Patients] ${isNew ? "Created" : "Updated"} patient: ${patient._id}`);

    return c.json({ data: { patientId: patient._id } }, isNew ? 201 : 200);
  } catch (error) {
    console.error("[Patients] Error creating/updating patient:", error instanceof Error ? error.message : "Unknown error");

    return c.json(
      { error: { message: "Failed to create or update patient", code: "INTERNAL_ERROR" } },
      500
    );
  }
});

/**
 * GET /api/patients/:id - Get a patient profile by ID
 */
patientsRouter.get("/:id", async (c) => {
  try {
    const patientId = c.req.param("id");

    const collection = await getPatientsCollection();
    const patientDoc = await collection.findOne({ _id: patientId as any });

    if (!patientDoc) {
      return c.json(
        { error: { message: "Patient not found", code: "NOT_FOUND" } },
        404
      );
    }

    // Transform MongoDB document to PatientProfile
    const patient: PatientProfile = {
      id: patientDoc._id,
      age: patientDoc.age,
      gender: patientDoc.gender,
      smokingStatus: patientDoc.smokingStatus,
      state: patientDoc.state,
      email: patientDoc.email,
      conditions: patientDoc.conditions || [],
      createdAt: patientDoc.createdAt,
    };

    // Include additional fields if they exist
    const response: any = patient;
    if ((patientDoc as any).extractedData) {
      response.extractedData = (patientDoc as any).extractedData;
    }
    if ((patientDoc as any).conditionDescription) {
      response.conditionDescription = (patientDoc as any).conditionDescription;
    }
    if ((patientDoc as any).aiParsedConditions) {
      response.aiParsedConditions = (patientDoc as any).aiParsedConditions;
    }
    if ((patientDoc as any).performanceStatus) {
      response.performanceStatus = (patientDoc as any).performanceStatus;
    }
    // Demographics
    if ((patientDoc as any).dateOfBirth) {
      response.dateOfBirth = (patientDoc as any).dateOfBirth;
    }
    if ((patientDoc as any).sexAtBirth) {
      response.sexAtBirth = (patientDoc as any).sexAtBirth;
    }
    if ((patientDoc as any).race) {
      response.race = (patientDoc as any).race;
    }
    if ((patientDoc as any).ethnicity) {
      response.ethnicity = (patientDoc as any).ethnicity;
    }
    // Medical History
    if ((patientDoc as any).primaryDiagnosis) {
      response.primaryDiagnosis = (patientDoc as any).primaryDiagnosis;
    }
    if ((patientDoc as any).currentMedications) {
      response.currentMedications = (patientDoc as any).currentMedications;
    }
    if ((patientDoc as any).knownAllergies) {
      response.knownAllergies = (patientDoc as any).knownAllergies;
    }
    if ((patientDoc as any).drugAllergies) {
      response.drugAllergies = (patientDoc as any).drugAllergies;
    }
    if ((patientDoc as any).pregnancyStatus) {
      response.pregnancyStatus = (patientDoc as any).pregnancyStatus;
    }
    // Health Status
    if ((patientDoc as any).generalHealthRating) {
      response.generalHealthRating = (patientDoc as any).generalHealthRating;
    }
    if ((patientDoc as any).organFunctionIssues) {
      response.organFunctionIssues = (patientDoc as any).organFunctionIssues;
    }
    if ((patientDoc as any).majorOperations) {
      response.majorOperations = (patientDoc as any).majorOperations;
    }
    if ((patientDoc as any).heightCm !== undefined) {
      response.heightCm = (patientDoc as any).heightCm;
    }
    if ((patientDoc as any).weightKg !== undefined) {
      response.weightKg = (patientDoc as any).weightKg;
    }

    return c.json({ data: response });
  } catch (error) {
    console.error("[Patients] Error fetching patient:", error instanceof Error ? error.message : "Unknown error");
    return c.json(
      { error: { message: "Failed to fetch patient", code: "INTERNAL_ERROR" } },
      500
    );
  }
});

/**
 * POST /api/patients/parse-conditions - Parse free-text condition description into structured conditions
 *
 * Uses OpenAI to extract structured medical conditions from a free-text description.
 * Also stores the parsed conditions in the patient document if a patientId is provided.
 */
patientsRouter.post("/parse-conditions", zValidator("json", ParseConditionsRequestSchema.extend({
  patientId: z.string().optional(),
})), async (c) => {
  try {
    const { description, patientId } = c.req.valid("json");
    console.log(`[Patients] Parsing conditions from description${patientId ? ` for patient ${patientId}` : ""}`);

    // Parse conditions using OpenAI
    const parsedConditions = await parseConditionsFromText(description);
    console.log(`[Patients] Parsed ${parsedConditions.length} conditions: ${parsedConditions.join(", ")}`);

    // If patientId provided, store the parsed conditions in the patient document
    if (patientId) {
      const collection = await getPatientsCollection();
      await collection.updateOne(
        { _id: patientId },
        {
          $set: {
            aiParsedConditions: parsedConditions,
            conditionDescription: description,
            updatedAt: new Date(),
          }
        }
      );
      console.log(`[Patients] Stored parsed conditions for patient ${patientId}`);
    }

    return c.json({ data: { conditions: parsedConditions } });
  } catch (error) {
    console.error("[Patients] Error parsing conditions:", error instanceof Error ? error.message : "Unknown error");
    return c.json(
      { error: { message: "Failed to parse conditions", code: "PARSE_ERROR" } },
      500
    );
  }
});

/**
 * POST /api/patients/quick-match - Submit a quick match with just email and document
 *
 * Accepts multipart/form-data with:
 * - email (required): Patient's email address
 * - document (required): Medical document to extract data from
 *
 * Uses Reducto to extract medical information from the document, then creates
 * a patient profile with defaults filled in where document extraction is incomplete.
 */
patientsRouter.post("/quick-match", async (c) => {
  try {
    const contentType = c.req.header("content-type") || "";

    if (!contentType.includes("multipart/form-data")) {
      return c.json(
        { error: { message: "Request must be multipart/form-data", code: "VALIDATION_ERROR" } },
        400
      );
    }

    const formData = await c.req.formData();
    const email = formData.get("email")?.toString();
    const document = formData.get("document");

    if (!email || !email.includes("@")) {
      return c.json(
        { error: { message: "Valid email is required", code: "VALIDATION_ERROR" } },
        400
      );
    }

    if (!document || !(document instanceof File)) {
      return c.json(
        { error: { message: "Document is required", code: "VALIDATION_ERROR" } },
        400
      );
    }

    console.log(`[Patients] Quick match request for ${email}`);

    // Process document with Reducto
    const fileBuffer = Buffer.from(await document.arrayBuffer());
    const extractedData = await processDocument(fileBuffer, document.name);

    console.log(`[Patients] Extracted data:`, JSON.stringify(extractedData));

    // Use LLM to analyze extracted data and generate optimal search terms
    // This focuses on the Assessment/Plan section and normalizes medical terminology
    const analysisResult = await analyzeExtractedDocumentData({
      medicalConditions: extractedData.medicalConditions,
      cancerType: extractedData.cancerType,
      cancerStage: extractedData.cancerStage,
      biomarkers: extractedData.biomarkers,
      priorTreatments: extractedData.priorTreatments,
    });

    console.log(`[Patients] LLM Analysis Result:`, JSON.stringify(analysisResult));

    // Build conditions from LLM analysis - prioritize search terms for accurate matching
    // The searchTerms are optimized for ClinicalTrials.gov API queries
    const conditions: string[] = [];

    // Add LLM-optimized search terms first (these are normalized medical terms)
    if (analysisResult.searchTerms && analysisResult.searchTerms.length > 0) {
      conditions.push(...analysisResult.searchTerms);
    }

    // Add primary condition if not already included
    if (analysisResult.primaryCondition && !conditions.includes(analysisResult.primaryCondition)) {
      conditions.unshift(analysisResult.primaryCondition);
    }

    // Remove duplicates
    const uniqueConditions = [...new Set(conditions)];

    console.log(`[Patients] Extracted conditions: ${uniqueConditions.join(", ") || "none"}`);

    // Store age range as-is (e.g., "31-45") instead of converting to a midpoint
    // This provides more accurate information to the AI matching system
    const ageRange = extractedData.ageRange || "unknown";

    // Map extracted gender or default to "other"
    const gender = extractedData.gender || "other";

    // Map smoking status or default to "never"
    const smokingStatusMap: Record<string, "never" | "former" | "current"> = {
      never: "never",
      former: "former",
      current: "current",
    };
    const smokingStatus = extractedData.smokingStatus
      ? smokingStatusMap[extractedData.smokingStatus] || "never"
      : "never";

    const now = new Date();
    const collection = await getPatientsCollection();

    // Create or update patient - CLEAR all old condition fields to prevent stale data
    const result = await collection.findOneAndUpdate(
      { email },
      {
        $set: {
          ageRange,
          gender,
          smokingStatus,
          state: "CA", // Default state
          conditions: uniqueConditions,
          extractedData,
          updatedAt: now,
          // Store LLM analysis for trial searching
          aiParsedConditions: analysisResult.searchTerms,
          primaryDiagnosis: analysisResult.primaryCondition,
          // Store biomarkers and treatments from extraction
          ...(extractedData.biomarkers && { biomarkers: extractedData.biomarkers }),
          ...(extractedData.priorTreatments && { priorTreatments: extractedData.priorTreatments }),
        },
        // Clear old fields that might have stale data
        $unset: {
          conditionDescription: "",
          // Also clear old biomarkers/treatments if new extraction doesn't have them
          ...(!extractedData.biomarkers && { biomarkers: "" }),
          ...(!extractedData.priorTreatments && { priorTreatments: "" }),
        },
        $setOnInsert: {
          _id: crypto.randomUUID(),
          email,
          createdAt: now,
        },
      },
      { upsert: true, returnDocument: "after" }
    );

    const patient = result;
    if (!patient) {
      return c.json(
        { error: { message: "Failed to create patient", code: "INTERNAL_ERROR" } },
        500
      );
    }

    console.log(`[Patients] Quick match patient created: ${patient._id}`);

    return c.json({ data: { patientId: patient._id } }, 201);
  } catch (error) {
    console.error("[Patients] Quick match error:", error instanceof Error ? error.message : "Unknown error");
    return c.json(
      { error: { message: "Failed to process quick match", code: "INTERNAL_ERROR" } },
      500
    );
  }
});

export { patientsRouter };
