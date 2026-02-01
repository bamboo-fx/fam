import { env } from "../env";
import type {
  PatientProfile,
  ClinicalTrial,
  ExtractedPatientData,
  MatchResult,
} from "../types";

// ============================================
// OpenAI Configuration
// ============================================

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-4o-mini";
const OPENAI_TEMPERATURE = 0.3;

// Rate limiting configuration
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

// ============================================
// Types
// ============================================

interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature: number;
  max_completion_tokens?: number;
}

interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface TrialMatchResponse {
  score: number;
  reasoning: string;
}

// ============================================
// System Prompts
// ============================================

const SYSTEM_PROMPT = `You are a clinical trial matching expert. Evaluate how well a patient matches a clinical trial's eligibility criteria.

HARD DISQUALIFIERS - Score MUST be 0 if ANY of these apply:
- Patient's age is outside the trial's age range (e.g., adult patient for pediatric trial)
- Patient's gender doesn't match trial requirements
- Patient's condition is completely unrelated to the trial's target condition
- Trial is for "healthy volunteers" but patient has significant health conditions

SCORING GUIDELINES:
- 85-100: Strong match - Patient clearly meets the trial's target population and key criteria
- 70-84: Good match - Patient likely qualifies with minor uncertainties
- 55-69: Moderate match - Patient may qualify pending further evaluation
- 40-54: Possible match - Some criteria met but significant unknowns
- 0-39: Poor match or disqualified - Patient unlikely to meet eligibility

KEY FACTORS TO CONSIDER:
1. Does the patient's condition match the trial's target condition?
2. Age requirements (if specified) - THIS IS A HARD REQUIREMENT
3. Gender requirements (if any)
4. Prior treatment history alignment
5. Performance status compatibility
6. Biomarker status (if relevant)

FORMAT YOUR RESPONSE AS JSON:
{
  "score": <number 0-100>,
  "reasoning": "• [Key match point 1]\\n• [Key match point 2]\\n• [Any concerns or unknowns]"
}

Use bullet points (•) in your reasoning. Be concise but specific about WHY this trial matches or doesn't match.`;

const CONDITION_PARSER_PROMPT = `You are a medical information extraction assistant. Your task is to extract medical conditions from a free-text patient description.

Extract any mentioned medical conditions, diseases, syndromes, or health issues. Be thorough but only extract actual medical conditions (not symptoms unless they are diagnostic).

Guidelines:
- Use standard medical terminology when possible
- Include the stage/grade if mentioned for cancer (e.g., "Stage IIIA Non-Small Cell Lung Cancer")
- Include relevant biomarker status if mentioned (e.g., "EGFR-positive lung cancer")
- Do NOT include demographic information, treatments, or medications
- Do NOT make up conditions that aren't mentioned

Always respond with valid JSON in this exact format:
{ "conditions": ["condition1", "condition2", ...] }

If no medical conditions are mentioned, return { "conditions": [] }`;

// ============================================
// Document Analysis Prompt for Assessment/Plan Focus
// ============================================

const DOCUMENT_ANALYSIS_PROMPT = `You are a clinical trial search optimization expert. Your task is to analyze extracted medical document data and generate optimal search terms for ClinicalTrials.gov.

IMPORTANT: Focus on the PRIMARY diagnosis from the Assessment and Plan section. This is the condition the patient is actively being treated for and seeking trials for.

Your task:
1. Identify the PRIMARY medical condition (the main diagnosis being treated)
2. Generate optimal search terms for ClinicalTrials.gov API
3. Normalize medical terminology to standard terms used in clinical trial databases

Guidelines for search term generation:
- Use standard medical terminology (e.g., "papillary thyroid carcinoma" not "thyroid problem")
- Include both specific and broader terms (e.g., "papillary thyroid carcinoma" AND "thyroid cancer")
- For cancer, include the histological type if known
- Include staging information if relevant (e.g., "stage II thyroid cancer")
- Exclude irrelevant co-morbidities that are NOT the primary focus of treatment
- Maximum 5 search terms, prioritized by relevance

Examples:
- If document mentions "Hashimoto's thyroiditis" in history but "Papillary thyroid carcinoma" in Assessment/Plan:
  Primary condition = "Papillary thyroid carcinoma"
  Search terms = ["papillary thyroid carcinoma", "thyroid cancer", "differentiated thyroid cancer"]

- If document mentions diabetes in history but "Stage IIIA NSCLC" in Assessment/Plan:
  Primary condition = "Stage IIIA Non-Small Cell Lung Cancer"
  Search terms = ["non-small cell lung cancer", "NSCLC", "stage III lung cancer", "lung adenocarcinoma"]

Always respond with valid JSON:
{
  "primaryCondition": "The main condition from Assessment/Plan",
  "searchTerms": ["term1", "term2", "term3"],
  "secondaryConditions": ["other relevant conditions if any"],
  "reasoning": "Brief explanation of why these search terms were chosen"
}`;

// ============================================
// Document Analysis Types
// ============================================

export interface DocumentAnalysisResult {
  primaryCondition: string;
  searchTerms: string[];
  secondaryConditions: string[];
  reasoning: string;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Format patient data for the prompt (sanitized)
 */
function formatPatientData(
  patient: PatientProfile,
  extractedData?: ExtractedPatientData,
  aiParsedConditions?: string[]
): string {
  const parts: string[] = [];

  // Use ageRange if available, otherwise use age
  if (patient.ageRange) {
    parts.push(`Age Range: ${patient.ageRange}`);
  } else if (patient.age) {
    parts.push(`Age: ${patient.age}`);
  }

  parts.push(`Gender: ${patient.gender}`);
  parts.push(`Smoking Status: ${patient.smokingStatus}`);
  parts.push(`State: ${patient.state}`);

  if (patient.conditions && patient.conditions.length > 0) {
    parts.push(`Conditions: ${patient.conditions.join(", ")}`);
  }

  // Add AI-parsed conditions if available (from free-text description)
  if (aiParsedConditions && aiParsedConditions.length > 0) {
    parts.push(`AI-Parsed Conditions: ${aiParsedConditions.join(", ")}`);
  }

  if (extractedData) {
    if (extractedData.cancerType) {
      parts.push(`Cancer Type: ${extractedData.cancerType}`);
    }
    if (extractedData.cancerStage) {
      parts.push(`Cancer Stage: ${extractedData.cancerStage}`);
    }
    if (extractedData.priorTreatments && extractedData.priorTreatments.length > 0) {
      parts.push(`Prior Treatments: ${extractedData.priorTreatments.join(", ")}`);
    }
    if (extractedData.biomarkers && extractedData.biomarkers.length > 0) {
      const biomarkerStr = extractedData.biomarkers
        .map((b) => `${b.name}: ${b.status}`)
        .join(", ");
      parts.push(`Biomarkers: ${biomarkerStr}`);
    }
  }

  return parts.join("\n");
}

/**
 * Format trial data for the prompt
 */
function formatTrialData(trial: ClinicalTrial): string {
  return [
    `Trial ID: ${trial.nctId}`,
    `Title: ${trial.title}`,
    `Status: ${trial.status}`,
    `Conditions: ${trial.conditions.join(", ")}`,
    `Eligibility Criteria:\n${trial.eligibilityCriteria}`,
  ].join("\n");
}

/**
 * Sleep helper for rate limiting
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Make a request to OpenAI API with retry logic
 */
async function makeOpenAIRequest(
  messages: OpenAIMessage[],
  retries = MAX_RETRIES
): Promise<OpenAIResponse> {
  const requestBody: OpenAIRequest = {
    model: OPENAI_MODEL,
    messages,
    temperature: OPENAI_TEMPERATURE,
    max_completion_tokens: 500,
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(OPENAI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify(requestBody),
      });

      // Handle rate limiting
      if (response.status === 429) {
        if (attempt < retries) {
          const retryAfter = response.headers.get("Retry-After");
          const delayMs = retryAfter
            ? parseInt(retryAfter, 10) * 1000
            : BASE_DELAY_MS * Math.pow(2, attempt);
          console.warn(`Rate limited. Retrying in ${delayMs}ms...`);
          await sleep(delayMs);
          continue;
        }
        throw new Error("Rate limit exceeded. Please try again later.");
      }

      // Handle other errors
      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`OpenAI API error (${response.status}): ${errorBody}`);
      }

      return (await response.json()) as OpenAIResponse;
    } catch (error) {
      if (attempt < retries && error instanceof Error && error.message.includes("fetch")) {
        // Network error, retry with exponential backoff
        const delayMs = BASE_DELAY_MS * Math.pow(2, attempt);
        console.warn(`Network error. Retrying in ${delayMs}ms...`);
        await sleep(delayMs);
        continue;
      }
      throw error;
    }
  }

  throw new Error("Max retries exceeded");
}

/**
 * Parse the AI response to extract score and reasoning
 */
function parseMatchResponse(content: string): TrialMatchResponse {
  try {
    // Try to parse as JSON directly
    const parsed = JSON.parse(content);
    if (typeof parsed.score === "number" && typeof parsed.reasoning === "string") {
      return {
        score: Math.max(0, Math.min(100, Math.round(parsed.score))),
        reasoning: parsed.reasoning,
      };
    }
  } catch {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*?"score"[\s\S]*?"reasoning"[\s\S]*?\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          score: Math.max(0, Math.min(100, Math.round(parsed.score))),
          reasoning: parsed.reasoning,
        };
      } catch {
        // Fall through to error
      }
    }
  }

  // If parsing fails, return a default response
  console.error("Failed to parse OpenAI response:", content);
  return {
    score: 0,
    reasoning: "Unable to evaluate match due to processing error.",
  };
}

// ============================================
// Public API
// ============================================

/**
 * Match a patient profile against a single trial
 * Returns a score (0-100) and reasoning for the match
 */
export async function evaluateTrialMatch(
  patient: PatientProfile,
  trial: ClinicalTrial,
  extractedData?: ExtractedPatientData,
  aiParsedConditions?: string[]
): Promise<{ score: number; reasoning: string }> {
  const patientInfo = formatPatientData(patient, extractedData, aiParsedConditions);
  const trialInfo = formatTrialData(trial);

  const userMessage = `Patient Profile:
${patientInfo}

Trial:
${trialInfo}

Respond with JSON: { "score": number 0-100, "reasoning": "brief explanation" }`;

  const messages: OpenAIMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userMessage },
  ];

  try {
    const response = await makeOpenAIRequest(messages);

    const firstChoice = response.choices?.[0];
    if (!firstChoice) {
      throw new Error("No response from OpenAI");
    }

    const content = firstChoice.message.content;
    return parseMatchResponse(content);
  } catch (error) {
    console.error("Error evaluating trial match:", error);
    throw error;
  }
}

/**
 * Match a patient against multiple trials and rank them
 * Returns an array of match results sorted by confidence score (descending)
 */
export async function matchPatientToTrials(
  patient: PatientProfile,
  trials: ClinicalTrial[],
  extractedData?: ExtractedPatientData,
  aiParsedConditions?: string[]
): Promise<MatchResult[]> {
  if (trials.length === 0) {
    return [];
  }

  const results: MatchResult[] = [];
  const now = new Date();

  // Process trials in batches to avoid overwhelming the API
  const BATCH_SIZE = 5;
  for (let i = 0; i < trials.length; i += BATCH_SIZE) {
    const batch = trials.slice(i, i + BATCH_SIZE);

    // Process batch concurrently
    const batchPromises = batch.map(async (trial) => {
      try {
        const { score, reasoning } = await evaluateTrialMatch(patient, trial, extractedData, aiParsedConditions);
        return {
          id: `${patient.id}_${trial.nctId}_${now.getTime()}`,
          patientId: patient.id,
          trialId: trial.nctId,
          confidenceScore: score,
          reasoning,
          createdAt: now,
        };
      } catch (error) {
        console.error(`Failed to evaluate trial ${trial.nctId}:`, error);
        // Return a low score for failed evaluations
        return {
          id: `${patient.id}_${trial.nctId}_${now.getTime()}`,
          patientId: patient.id,
          trialId: trial.nctId,
          confidenceScore: 0,
          reasoning: "Evaluation failed due to processing error.",
          createdAt: now,
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Small delay between batches to be respectful of rate limits
    if (i + BATCH_SIZE < trials.length) {
      await sleep(500);
    }
  }

  // Sort by confidence score descending
  return results.sort((a, b) => b.confidenceScore - a.confidenceScore);
}

/**
 * Parse a free-text description to extract medical conditions
 * Returns an array of condition names
 */
export async function parseConditionsFromText(description: string): Promise<string[]> {
  const messages: OpenAIMessage[] = [
    { role: "system", content: CONDITION_PARSER_PROMPT },
    { role: "user", content: `Extract medical conditions from this description:\n\n${description}` },
  ];

  try {
    const response = await makeOpenAIRequest(messages);

    const firstChoice = response.choices?.[0];
    if (!firstChoice) {
      throw new Error("No response from OpenAI");
    }

    const content = firstChoice.message.content;

    // Parse the JSON response
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed.conditions)) {
        return parsed.conditions.filter((c: unknown) => typeof c === "string" && c.trim().length > 0);
      }
    } catch {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*?"conditions"[\s\S]*?\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed.conditions)) {
            return parsed.conditions.filter((c: unknown) => typeof c === "string" && c.trim().length > 0);
          }
        } catch {
          // Fall through to empty array
        }
      }
    }

    console.error("Failed to parse conditions from OpenAI response:", content);
    return [];
  } catch (error) {
    console.error("Error parsing conditions:", error);
    throw error;
  }
}

/**
 * Analyze extracted document data to generate optimal search terms for clinical trial matching
 *
 * This function takes raw extracted data (from Reducto) and uses LLM to:
 * 1. Identify the primary condition from Assessment/Plan section
 * 2. Generate normalized search terms for ClinicalTrials.gov
 * 3. Filter out irrelevant conditions (e.g., co-morbidities not being treated)
 *
 * @param extractedData - Raw extracted data from document processing
 * @returns Analyzed result with primary condition and optimized search terms
 */
export async function analyzeExtractedDocumentData(extractedData: {
  medicalConditions?: string[];
  cancerType?: string;
  cancerStage?: string;
  biomarkers?: Array<{ name: string; status: string }>;
  priorTreatments?: string[];
}): Promise<DocumentAnalysisResult> {
  // Build a summary of extracted data for the LLM
  const dataSummary: string[] = [];

  if (extractedData.medicalConditions && extractedData.medicalConditions.length > 0) {
    dataSummary.push(`Medical Conditions Extracted: ${extractedData.medicalConditions.join(", ")}`);
  }

  if (extractedData.cancerType) {
    dataSummary.push(`Cancer Type: ${extractedData.cancerType}`);
  }

  if (extractedData.cancerStage) {
    dataSummary.push(`Cancer Stage: ${extractedData.cancerStage}`);
  }

  if (extractedData.biomarkers && extractedData.biomarkers.length > 0) {
    const biomarkerStr = extractedData.biomarkers
      .map((b) => `${b.name}: ${b.status}`)
      .join(", ");
    dataSummary.push(`Biomarkers: ${biomarkerStr}`);
  }

  if (extractedData.priorTreatments && extractedData.priorTreatments.length > 0) {
    dataSummary.push(`Prior Treatments: ${extractedData.priorTreatments.join(", ")}`);
  }

  // If no data to analyze, return empty result
  if (dataSummary.length === 0) {
    console.log("[OpenAI] No extracted data to analyze");
    return {
      primaryCondition: "",
      searchTerms: [],
      secondaryConditions: [],
      reasoning: "No medical data extracted from document",
    };
  }

  const messages: OpenAIMessage[] = [
    { role: "system", content: DOCUMENT_ANALYSIS_PROMPT },
    {
      role: "user",
      content: `Analyze this extracted medical document data and generate optimal clinical trial search terms:\n\n${dataSummary.join("\n")}`,
    },
  ];

  try {
    console.log("[OpenAI] Analyzing extracted document data for search optimization");
    const response = await makeOpenAIRequest(messages);

    const firstChoice = response.choices?.[0];
    if (!firstChoice) {
      throw new Error("No response from OpenAI");
    }

    const content = firstChoice.message.content;

    // Parse the JSON response
    try {
      const parsed = JSON.parse(content);
      const result: DocumentAnalysisResult = {
        primaryCondition: parsed.primaryCondition || "",
        searchTerms: Array.isArray(parsed.searchTerms)
          ? parsed.searchTerms.filter((t: unknown) => typeof t === "string" && t.trim().length > 0)
          : [],
        secondaryConditions: Array.isArray(parsed.secondaryConditions)
          ? parsed.secondaryConditions.filter((c: unknown) => typeof c === "string" && c.trim().length > 0)
          : [],
        reasoning: parsed.reasoning || "",
      };

      console.log(`[OpenAI] Document analysis complete:`);
      console.log(`  Primary condition: ${result.primaryCondition}`);
      console.log(`  Search terms: ${result.searchTerms.join(", ")}`);
      console.log(`  Reasoning: ${result.reasoning}`);

      return result;
    } catch {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*?"primaryCondition"[\s\S]*?\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            primaryCondition: parsed.primaryCondition || "",
            searchTerms: Array.isArray(parsed.searchTerms) ? parsed.searchTerms : [],
            secondaryConditions: Array.isArray(parsed.secondaryConditions) ? parsed.secondaryConditions : [],
            reasoning: parsed.reasoning || "",
          };
        } catch {
          // Fall through to fallback
        }
      }
    }

    // Fallback: use the raw extracted conditions
    console.warn("[OpenAI] Failed to parse document analysis, using fallback");
    const fallbackConditions = [
      ...(extractedData.medicalConditions || []),
      extractedData.cancerType,
    ].filter(Boolean) as string[];

    return {
      primaryCondition: extractedData.cancerType || fallbackConditions[0] || "",
      searchTerms: fallbackConditions.slice(0, 5),
      secondaryConditions: [],
      reasoning: "Fallback: using raw extracted conditions",
    };
  } catch (error) {
    console.error("[OpenAI] Error analyzing document data:", error);

    // Return fallback with raw extracted data
    const fallbackConditions = [
      ...(extractedData.medicalConditions || []),
      extractedData.cancerType,
    ].filter(Boolean) as string[];

    return {
      primaryCondition: extractedData.cancerType || fallbackConditions[0] || "",
      searchTerms: fallbackConditions.slice(0, 5),
      secondaryConditions: [],
      reasoning: "Error during analysis: using raw extracted conditions",
    };
  }
}

// ============================================
// Streaming Progress Types
// ============================================

export interface MatchingProgressEvent {
  type: "matching_start" | "matching_trial" | "matching_complete";
  data: Record<string, unknown>;
}

export interface MatchingTrialProgress {
  nctId: string;
  title: string;
  score: number;
  reasoning: string;
  index: number;
  total: number;
}

// ============================================
// Streaming Matching
// ============================================

/**
 * Match a patient against multiple trials with progress callbacks for SSE streaming
 * Returns an array of match results sorted by confidence score (descending)
 */
export async function matchPatientToTrialsWithProgress(
  patient: PatientProfile,
  trials: ClinicalTrial[],
  onProgress: (event: MatchingProgressEvent) => Promise<void>,
  extractedData?: ExtractedPatientData,
  aiParsedConditions?: string[]
): Promise<MatchResult[]> {
  if (trials.length === 0) {
    return [];
  }

  // Emit start event
  await onProgress({
    type: "matching_start",
    data: { totalTrials: trials.length },
  });

  const results: MatchResult[] = [];
  const now = new Date();

  // Process trials one by one for progress updates
  for (let i = 0; i < trials.length; i++) {
    const trial = trials[i];
    if (!trial) continue;

    try {
      const { score, reasoning } = await evaluateTrialMatch(
        patient,
        trial,
        extractedData,
        aiParsedConditions
      );

      const result: MatchResult = {
        id: `${patient.id}_${trial.nctId}_${now.getTime()}`,
        patientId: patient.id,
        trialId: trial.nctId,
        confidenceScore: score,
        reasoning,
        createdAt: now,
      };

      results.push(result);

      // Emit trial progress event
      await onProgress({
        type: "matching_trial",
        data: {
          nctId: trial.nctId,
          title: trial.title,
          score,
          reasoning,
          index: i + 1,
          total: trials.length,
        },
      });

      console.log(
        `[OpenAI] Matched trial ${trial.nctId} (${i + 1}/${trials.length}): score=${score}`
      );
    } catch (error) {
      console.error(`Failed to evaluate trial ${trial.nctId}:`, error);
      // Return a low score for failed evaluations
      const result: MatchResult = {
        id: `${patient.id}_${trial.nctId}_${now.getTime()}`,
        patientId: patient.id,
        trialId: trial.nctId,
        confidenceScore: 0,
        reasoning: "Evaluation failed due to processing error.",
        createdAt: now,
      };

      results.push(result);

      // Still emit progress for failed trials
      await onProgress({
        type: "matching_trial",
        data: {
          nctId: trial.nctId,
          title: trial.title,
          score: 0,
          reasoning: "Evaluation failed due to processing error.",
          index: i + 1,
          total: trials.length,
        },
      });
    }

    // Small delay between requests to be respectful of rate limits
    if (i < trials.length - 1) {
      await sleep(300);
    }
  }

  // Emit complete event - only count matches with score >= 40 (at least "Possible match")
  const validMatches = results.filter((m) => m.confidenceScore >= 40);
  await onProgress({
    type: "matching_complete",
    data: { matchCount: validMatches.length },
  });

  // Sort by confidence score descending
  return results.sort((a, b) => b.confidenceScore - a.confidenceScore);
}
