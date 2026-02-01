import { env } from "../env";
import { getTrialsCollection } from "./mongodb";
import type { ClinicalTrial } from "../types";

// ============================================
// ClinicalTrials.gov API Configuration
// Using the official API instead of scraping for reliable data
// ============================================

const CT_API_BASE = "https://clinicaltrials.gov/api/v2";

// ============================================
// Types for ClinicalTrials.gov API
// ============================================

interface CTStudy {
  protocolSection: {
    identificationModule: {
      nctId: string;
      briefTitle: string;
      officialTitle?: string;
    };
    statusModule: {
      overallStatus: string;
    };
    conditionsModule?: {
      conditions?: string[];
    };
    eligibilityModule?: {
      eligibilityCriteria?: string;
      sex?: string;
      minimumAge?: string;
      maximumAge?: string;
      healthyVolunteers?: string;
    };
    contactsLocationsModule?: {
      centralContacts?: Array<{
        name?: string;
        role?: string;
        phone?: string;
        email?: string;
      }>;
      overallOfficials?: Array<{
        name?: string;
        affiliation?: string;
        role?: string;
      }>;
    };
  };
}

interface CTSearchResponse {
  studies: CTStudy[];
  totalCount: number;
  nextPageToken?: string;
}

// ============================================
// ClinicalTrials.gov API Functions
// ============================================

/**
 * Search ClinicalTrials.gov API for recruiting trials matching conditions
 * Uses a combined approach: first tries the primary condition (most specific),
 * then falls back to OR search for broader results
 */
async function searchTrials(conditions: string[], maxResults: number = 30): Promise<CTStudy[]> {
  // If no conditions, just search for recruiting trials
  if (conditions.length === 0) {
    const params = new URLSearchParams({
      "query.term": "AREA[OverallStatus]RECRUITING",
      pageSize: String(maxResults),
      format: "json",
      fields: [
        "NCTId",
        "BriefTitle",
        "OfficialTitle",
        "OverallStatus",
        "Condition",
        "EligibilityCriteria",
        "Sex",
        "MinimumAge",
        "MaximumAge",
        "HealthyVolunteers",
        "CentralContactEMail",
        "CentralContactName",
        "CentralContactPhone"
      ].join("|")
    });

    const url = `${CT_API_BASE}/studies?${params}`;
    console.log(`[ClinicalTrials API] Fetching: ${url}`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as CTSearchResponse;
    console.log(`[ClinicalTrials API] Found ${data.studies?.length || 0} studies (total: ${data.totalCount})`);
    return data.studies || [];
  }

  // Clean and prioritize conditions - cancer types and specific diagnoses first
  const prioritizedConditions = conditions
    .map(c => c.trim())
    .filter(c => c.length > 0)
    .sort((a, b) => {
      // Prioritize specific cancer types and diagnoses
      const aIsCancer = /cancer|carcinoma|tumor|lymphoma|leukemia|melanoma|sarcoma/i.test(a);
      const bIsCancer = /cancer|carcinoma|tumor|lymphoma|leukemia|melanoma|sarcoma/i.test(b);
      if (aIsCancer && !bIsCancer) return -1;
      if (!aIsCancer && bIsCancer) return 1;
      // Longer conditions tend to be more specific
      return b.length - a.length;
    });

  console.log(`[ClinicalTrials API] Prioritized conditions: ${prioritizedConditions.join(", ")}`);

  // Try primary condition first (most specific) to get highly relevant results
  const primaryCondition = prioritizedConditions[0];
  const primaryQuery = `AREA[OverallStatus]RECRUITING AND AREA[Condition]${primaryCondition}`;

  const params = new URLSearchParams({
    "query.term": primaryQuery,
    pageSize: String(maxResults),
    format: "json",
    fields: [
      "NCTId",
      "BriefTitle",
      "OfficialTitle",
      "OverallStatus",
      "Condition",
      "EligibilityCriteria",
      "Sex",
      "MinimumAge",
      "MaximumAge",
      "HealthyVolunteers",
      "CentralContactEMail",
      "CentralContactName",
      "CentralContactPhone"
    ].join("|")
  });

  const url = `${CT_API_BASE}/studies?${params}`;
  console.log(`[ClinicalTrials API] Fetching: ${url}`);

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as CTSearchResponse;
    console.log(`[ClinicalTrials API] Found ${data.studies?.length || 0} studies for primary condition (total: ${data.totalCount})`);

    // If we got enough results with primary condition, return them
    if (data.studies && data.studies.length >= 10) {
      return data.studies;
    }

    // If not enough results, try broader search with OR logic for secondary conditions
    if (prioritizedConditions.length > 1 && (!data.studies || data.studies.length < maxResults)) {
      console.log(`[ClinicalTrials API] Expanding search with secondary conditions...`);

      const orQuery = prioritizedConditions
        .slice(0, 3) // Limit to top 3 conditions to avoid overly broad search
        .map(c => `AREA[Condition]${c}`)
        .join(" OR ");

      const expandedQuery = `AREA[OverallStatus]RECRUITING AND (${orQuery})`;

      const expandedParams = new URLSearchParams({
        "query.term": expandedQuery,
        pageSize: String(maxResults),
        format: "json",
        fields: [
          "NCTId",
          "BriefTitle",
          "OfficialTitle",
          "OverallStatus",
          "Condition",
          "EligibilityCriteria",
          "Sex",
          "MinimumAge",
          "MaximumAge",
          "HealthyVolunteers",
          "CentralContactEMail",
          "CentralContactName",
          "CentralContactPhone"
        ].join("|")
      });

      const expandedUrl = `${CT_API_BASE}/studies?${expandedParams}`;
      console.log(`[ClinicalTrials API] Expanded search: ${expandedUrl}`);

      const expandedResponse = await fetch(expandedUrl);
      if (expandedResponse.ok) {
        const expandedData = await expandedResponse.json() as CTSearchResponse;
        console.log(`[ClinicalTrials API] Expanded search found ${expandedData.studies?.length || 0} studies`);

        // Merge results, preferring primary condition matches
        const primaryIds = new Set((data.studies || []).map(s => s.protocolSection.identificationModule.nctId));
        const combined = [
          ...(data.studies || []),
          ...(expandedData.studies || []).filter(s => !primaryIds.has(s.protocolSection.identificationModule.nctId))
        ];

        return combined.slice(0, maxResults);
      }
    }

    return data.studies || [];
  } catch (error) {
    console.error("[ClinicalTrials API] Search failed:", error);
    throw error;
  }
}

/**
 * Convert API study to our ClinicalTrial format
 */
function convertToClinicalTrial(study: CTStudy): ClinicalTrial {
  const id = study.protocolSection.identificationModule;
  const status = study.protocolSection.statusModule;
  const conditions = study.protocolSection.conditionsModule;
  const eligibility = study.protocolSection.eligibilityModule;
  const contacts = study.protocolSection.contactsLocationsModule;

  // Extract contact email and name from central contacts
  const centralContact = contacts?.centralContacts?.find(c => c.email || c.name);
  const contactEmail = centralContact?.email || contacts?.centralContacts?.find(c => c.email)?.email;
  const contactName = centralContact?.name || contacts?.centralContacts?.find(c => c.name)?.name;

  // Build eligibility summary
  const eligibilityParts: string[] = [];

  if (eligibility?.minimumAge || eligibility?.maximumAge) {
    const ageRange = [eligibility.minimumAge, eligibility.maximumAge]
      .filter(Boolean)
      .join(" to ");
    if (ageRange) eligibilityParts.push(`Age: ${ageRange}`);
  }

  if (eligibility?.sex && eligibility.sex !== "ALL") {
    eligibilityParts.push(`Sex: ${eligibility.sex}`);
  }

  if (eligibility?.healthyVolunteers) {
    eligibilityParts.push(`Healthy Volunteers: ${eligibility.healthyVolunteers}`);
  }

  // Add key criteria from full eligibility text
  if (eligibility?.eligibilityCriteria) {
    const criteria = eligibility.eligibilityCriteria;
    // Extract first few inclusion criteria
    const inclusionMatch = criteria.match(/inclusion criteria[:\s]*(.{0,500})/i);
    if (inclusionMatch?.[1]) {
      const summary = inclusionMatch[1]
        .split(/\n/)
        .slice(0, 3)
        .map(line => line.trim())
        .filter(line => line.length > 10)
        .join("; ");
      if (summary) eligibilityParts.push(`Key inclusion: ${summary}`);
    }
  }

  const eligibilitySummary = eligibilityParts.length > 0
    ? eligibilityParts.join(". ") + "."
    : "See ClinicalTrials.gov for full eligibility criteria.";

  return {
    nctId: id.nctId,
    title: id.officialTitle || id.briefTitle,
    status: status.overallStatus,
    conditions: conditions?.conditions || [],
    eligibilityCriteria: eligibilitySummary,
    url: `https://clinicaltrials.gov/study/${id.nctId}`,
    contactEmail,
    contactName,
    ingestedAt: new Date(),
  };
}

// ============================================
// Public API Functions
// ============================================

/**
 * Fetch trials from ClinicalTrials.gov API for given conditions
 */
export async function scrapeTrialsForConditions(conditions: string[]): Promise<ClinicalTrial[]> {
  const conditionLabel = conditions.length > 0 ? conditions.join(", ") : "general recruiting";
  console.log(`[ClinicalTrials API] Searching for: ${conditionLabel}`);

  try {
    const studies = await searchTrials(conditions, 30);
    const trials = studies.map(convertToClinicalTrial);

    console.log(`[ClinicalTrials API] Converted ${trials.length} trials`);
    return trials;
  } catch (error) {
    console.error("[ClinicalTrials API] Failed to fetch trials:", error);
    return [];
  }
}

/**
 * Ingest trials into MongoDB for specific conditions
 */
export async function ingestTrialsForConditions(conditions: string[]): Promise<{
  count: number;
  trials: ClinicalTrial[];
}> {
  console.log(`[ClinicalTrials API] Starting ingestion for: ${conditions.join(", ") || "general"}`);

  const trials = await scrapeTrialsForConditions(conditions);

  if (trials.length === 0) {
    console.log("[ClinicalTrials API] No trials found");
    return { count: 0, trials: [] };
  }

  const collection = await getTrialsCollection();
  const ingestedTrials: ClinicalTrial[] = [];

  for (const trial of trials) {
    try {
      await collection.updateOne(
        { _id: trial.nctId },
        {
          $set: {
            nctId: trial.nctId,
            title: trial.title,
            status: trial.status,
            conditions: trial.conditions,
            eligibilityCriteria: trial.eligibilityCriteria,
            url: trial.url,
            contactEmail: trial.contactEmail,
            ingestedAt: new Date(),
          },
        },
        { upsert: true }
      );
      ingestedTrials.push(trial);
    } catch (err) {
      console.error(`[ClinicalTrials API] Failed to upsert ${trial.nctId}:`, err);
    }
  }

  console.log(`[ClinicalTrials API] Ingested ${ingestedTrials.length} trials`);
  return { count: ingestedTrials.length, trials: ingestedTrials };
}

/**
 * Legacy function - ingest trials with empty conditions
 */
export async function ingestTrials(): Promise<{
  count: number;
  trials: ClinicalTrial[];
}> {
  return ingestTrialsForConditions([]);
}

/**
 * Get all trials from the database
 */
export async function getAllTrials(): Promise<ClinicalTrial[]> {
  const collection = await getTrialsCollection();
  const documents = await collection.find({}).toArray();

  return documents.map((doc) => ({
    nctId: doc.nctId,
    title: doc.title,
    status: doc.status,
    conditions: doc.conditions,
    eligibilityCriteria: doc.eligibilityCriteria,
    url: doc.url,
    contactEmail: (doc as any).contactEmail,
    ingestedAt: doc.ingestedAt,
  }));
}

/**
 * Clear all trials from the database
 */
export async function clearTrials(): Promise<void> {
  const collection = await getTrialsCollection();
  await collection.deleteMany({});
  console.log("[ClinicalTrials API] Cleared all trials");
}

/**
 * Get a single trial by NCT ID
 */
export async function getTrialByNctId(nctId: string): Promise<ClinicalTrial | null> {
  const collection = await getTrialsCollection();
  const document = await collection.findOne({ nctId });

  if (!document) return null;

  return {
    nctId: document.nctId,
    title: document.title,
    status: document.status,
    conditions: document.conditions,
    eligibilityCriteria: document.eligibilityCriteria,
    url: document.url,
    contactEmail: (document as any).contactEmail,
    ingestedAt: document.ingestedAt,
  };
}

// ============================================
// Streaming Progress Types
// ============================================

export interface FirecrawlProgressEvent {
  type: "firecrawl_start" | "firecrawl_found" | "firecrawl_trial" | "firecrawl_complete";
  data: Record<string, unknown>;
}

/**
 * Ingest trials with progress callbacks for SSE streaming
 */
export async function ingestTrialsWithProgress(
  onProgress: (event: FirecrawlProgressEvent) => Promise<void>,
  conditions: string[] = []
): Promise<{ count: number; trials: ClinicalTrial[] }> {
  const conditionLabel = conditions.length > 0 ? conditions.join(", ") : "recruiting trials";
  console.log(`[ClinicalTrials API] Starting streaming ingestion for: ${conditionLabel}`);

  // Clear existing trials
  await clearTrials();

  // Emit start event
  await onProgress({
    type: "firecrawl_start",
    data: {
      message: `Searching ClinicalTrials.gov for ${conditionLabel}...`,
      conditions
    },
  });

  try {
    // Fetch from API
    const studies = await searchTrials(conditions, 30);

    if (studies.length === 0) {
      await onProgress({
        type: "firecrawl_found",
        data: { nctIdsFound: 0 },
      });
      await onProgress({
        type: "firecrawl_complete",
        data: { trialsScraped: 0 },
      });
      return { count: 0, trials: [] };
    }

    // Emit found event
    await onProgress({
      type: "firecrawl_found",
      data: { nctIdsFound: studies.length },
    });

    // Convert and save each trial
    const collection = await getTrialsCollection();
    const trials: ClinicalTrial[] = [];

    for (let i = 0; i < studies.length; i++) {
      const study = studies[i]!;
      const trial = convertToClinicalTrial(study);

      // Save to database
      await collection.updateOne(
        { _id: trial.nctId },
        {
          $set: {
            nctId: trial.nctId,
            title: trial.title,
            status: trial.status,
            conditions: trial.conditions,
            eligibilityCriteria: trial.eligibilityCriteria,
            url: trial.url,
            contactEmail: trial.contactEmail,
            ingestedAt: new Date(),
          },
        },
        { upsert: true }
      );

      trials.push(trial);

      // Emit trial progress event
      await onProgress({
        type: "firecrawl_trial",
        data: {
          nctId: trial.nctId,
          title: trial.title,
          status: trial.status,
          index: i + 1,
          total: studies.length,
        },
      });

      // Small delay for visual effect
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Emit complete event
    await onProgress({
      type: "firecrawl_complete",
      data: { trialsScraped: trials.length },
    });

    console.log(`[ClinicalTrials API] Streaming complete: ${trials.length} trials`);
    return { count: trials.length, trials };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[ClinicalTrials API] Streaming ingestion error:", message);
    throw error;
  }
}
