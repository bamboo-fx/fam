import { env } from "../env";
import type { ExtractedPatientData } from "../types";

// ============================================
// Reducto API Configuration
// ============================================

const REDUCTO_BASE_URL = "https://platform.reducto.ai";
const REDUCTO_UPLOAD_ENDPOINT = `${REDUCTO_BASE_URL}/upload`;
const REDUCTO_EXTRACT_ENDPOINT = `${REDUCTO_BASE_URL}/extract`;

// ============================================
// Types for Reducto API Responses
// ============================================

interface ReductoUploadResponse {
  file_id: string;
}

interface ReductoExtractResponse {
  job_id: string;
  result: MedicalExtractionResult[];
  usage: {
    num_pages: number;
    num_fields: number;
    credits: number;
  };
  studio_link: string;
}

// Schema for medical data extraction
interface MedicalExtractionResult {
  cancer_type?: string;
  cancer_stage?: string;
  medical_conditions?: string[];
  biomarkers?: Array<{
    name: string;
    status: string;
  }>;
  prior_treatments?: string[];
  performance_status?: string;
  age_range?: string;
  gender?: string;
  smoking_status?: string;
}

// ============================================
// JSON Schema for Reducto Extract API
// ============================================

// This schema tells Reducto what fields to extract from medical documents
// We ONLY request non-identifying medical information
// IMPORTANT: Extraction prioritizes Assessment and Plan section for accurate clinical trial matching
const MEDICAL_EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    medical_conditions: {
      type: "array",
      description: "List of medical conditions from the ASSESSMENT AND PLAN section primarily. Extract the primary diagnosis and any secondary conditions that are the focus of treatment. Do NOT include conditions from Review of Systems, Family History, or Social History unless they are the primary diagnosis being treated.",
      items: {
        type: "string",
      },
    },
    cancer_type: {
      type: "string",
      description: "Type of cancer if mentioned in Assessment/Plan section (e.g., lung cancer, breast cancer, NSCLC, SCLC, melanoma, thyroid cancer, papillary thyroid carcinoma). Extract only the cancer type, no patient details.",
    },
    cancer_stage: {
      type: "string",
      description: "Cancer stage from Assessment/Plan if mentioned (e.g., Stage I, Stage II, Stage IIIA, Stage IV, metastatic). Extract only the stage designation.",
    },
    biomarkers: {
      type: "array",
      description: "List of biomarker test results. Common biomarkers include EGFR, ALK, ROS1, BRAF, KRAS, PD-L1, HER2, MET, BRCA1, BRCA2.",
      items: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Biomarker name (e.g., EGFR, ALK, PD-L1)",
          },
          status: {
            type: "string",
            description: "Result status (e.g., positive, negative, mutated, wild-type, high expression, low expression, percentage)",
          },
        },
      },
    },
    prior_treatments: {
      type: "array",
      description: "List of treatment types the patient has received. Extract only treatment category names (e.g., chemotherapy, immunotherapy, radiation, surgery, targeted therapy), not specific drug names or dates.",
      items: {
        type: "string",
      },
    },
    performance_status: {
      type: "string",
      description: "ECOG performance status (0-5) or Karnofsky score if available. Extract only the score/status.",
    },
    age_range: {
      type: "string",
      enum: ["18-30", "31-45", "46-60", "61-75", "75+"],
      description: "Age range bracket. Infer from any age mentions but only return the bracket, never the exact age.",
    },
    gender: {
      type: "string",
      enum: ["male", "female", "other"],
      description: "Patient gender if mentioned.",
    },
    smoking_status: {
      type: "string",
      enum: ["never", "former", "current"],
      description: "Smoking history status.",
    },
  },
};

// ============================================
// Private Helper Functions
// ============================================

/**
 * Upload a file buffer to Reducto
 * Returns the file_id for use in extraction
 */
async function uploadToReducto(fileBuffer: Buffer, filename: string): Promise<string> {
  const formData = new FormData();
  const blob = new Blob([fileBuffer], { type: getMimeType(filename) });
  formData.append("file", blob, filename);

  const response = await fetch(REDUCTO_UPLOAD_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.REDUCTO_API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Reducto upload failed: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as ReductoUploadResponse;
  return data.file_id;
}

/**
 * Extract structured data from an uploaded file using Reducto Extract API
 *
 * IMPORTANT: This extraction prioritizes the ASSESSMENT AND PLAN section of medical documents,
 * as this section contains the most relevant diagnostic and treatment information for clinical trial matching.
 */
async function extractFromReducto(fileId: string): Promise<MedicalExtractionResult[]> {
  const response = await fetch(REDUCTO_EXTRACT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.REDUCTO_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: fileId,
      instructions: {
        schema: MEDICAL_EXTRACTION_SCHEMA,
        system_prompt:
          "PRIORITIZE the ASSESSMENT AND PLAN section of this medical document. " +
          "The Assessment and Plan (or Assessment/Plan, A/P, Impression and Plan) section contains " +
          "the primary diagnosis and treatment recommendations which are most relevant for clinical trial matching. " +
          "Extract medical conditions PRIMARILY from the Assessment and Plan section. " +
          "If no clear Assessment/Plan section exists, look for Impression, Diagnosis, or Problem List sections. " +
          "Do NOT extract conditions from irrelevant sections like Review of Systems, Social History, or Family History " +
          "unless they are the PRIMARY diagnosis. " +
          "Do NOT extract any personally identifiable information such as names, dates of birth, " +
          "addresses, phone numbers, email addresses, social security numbers, or medical record numbers. " +
          "Focus on: (1) Primary diagnosis from Assessment/Plan, (2) Target conditions for treatment, " +
          "(3) Relevant biomarkers, (4) Current cancer staging if applicable.",
      },
      settings: {
        array_extract: false,
        citations: { enabled: false },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Reducto extraction failed: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as ReductoExtractResponse;
  return data.result;
}

/**
 * Get MIME type from filename
 */
function getMimeType(filename: string): string {
  const ext = filename.toLowerCase().split(".").pop();
  const mimeTypes: Record<string, string> = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    tiff: "image/tiff",
    tif: "image/tiff",
    bmp: "image/bmp",
    webp: "image/webp",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
  return mimeTypes[ext || ""] || "application/octet-stream";
}

/**
 * Validate and normalize age range
 */
function normalizeAgeRange(value: string | undefined): ExtractedPatientData["ageRange"] {
  if (!value) return undefined;
  const validRanges = ["18-30", "31-45", "46-60", "61-75", "75+"] as const;
  const normalized = value.trim();
  if (validRanges.includes(normalized as any)) {
    return normalized as (typeof validRanges)[number];
  }
  return undefined;
}

/**
 * Validate and normalize gender
 */
function normalizeGender(value: string | undefined): ExtractedPatientData["gender"] {
  if (!value) return undefined;
  const normalized = value.toLowerCase().trim();
  if (normalized === "male" || normalized === "m") return "male";
  if (normalized === "female" || normalized === "f") return "female";
  if (normalized === "other") return "other";
  return undefined;
}

/**
 * Validate and normalize smoking status
 */
function normalizeSmokingStatus(value: string | undefined): ExtractedPatientData["smokingStatus"] {
  if (!value) return undefined;
  const normalized = value.toLowerCase().trim();
  if (normalized === "never" || normalized.includes("non-smoker") || normalized.includes("non smoker")) {
    return "never";
  }
  if (normalized === "former" || normalized.includes("ex-smoker") || normalized.includes("quit")) {
    return "former";
  }
  if (normalized === "current" || normalized.includes("active smoker")) {
    return "current";
  }
  return undefined;
}

/**
 * Normalize treatment keywords to general categories
 */
function normalizeTreatments(treatments: string[] | undefined): string[] {
  if (!treatments || treatments.length === 0) return [];

  const treatmentCategories = [
    "chemotherapy",
    "immunotherapy",
    "radiation",
    "surgery",
    "targeted therapy",
    "hormone therapy",
    "stem cell transplant",
    "clinical trial",
  ];

  const normalized: Set<string> = new Set();

  for (const treatment of treatments) {
    const lower = treatment.toLowerCase();

    // Map to general categories
    if (lower.includes("chemo")) normalized.add("chemotherapy");
    if (lower.includes("immuno") || lower.includes("pd-1") || lower.includes("pd-l1") || lower.includes("ctla"))
      normalized.add("immunotherapy");
    if (lower.includes("radiat") || lower.includes("xrt") || lower.includes("sbrt")) normalized.add("radiation");
    if (lower.includes("surg") || lower.includes("resect") || lower.includes("ectomy")) normalized.add("surgery");
    if (lower.includes("target") || lower.includes("tki") || lower.includes("inhibitor"))
      normalized.add("targeted therapy");
    if (lower.includes("hormon") || lower.includes("endocrine")) normalized.add("hormone therapy");
    if (lower.includes("transplant") || lower.includes("stem cell")) normalized.add("stem cell transplant");
    if (lower.includes("trial")) normalized.add("clinical trial");

    // If it matches a known category directly, add it
    for (const category of treatmentCategories) {
      if (lower.includes(category)) {
        normalized.add(category);
      }
    }
  }

  return Array.from(normalized);
}

/**
 * Normalize biomarkers to standard format
 */
function normalizeBiomarkers(
  biomarkers: Array<{ name: string; status: string }> | undefined
): ExtractedPatientData["biomarkers"] {
  if (!biomarkers || biomarkers.length === 0) return undefined;

  const knownBiomarkers = ["EGFR", "ALK", "ROS1", "BRAF", "KRAS", "PD-L1", "HER2", "MET", "NTRK", "RET"];

  return biomarkers
    .filter((b) => b.name && b.status)
    .map((b) => {
      // Normalize biomarker name to uppercase
      let name = b.name.toUpperCase().trim();

      // Map common variations
      if (name.includes("PD-L1") || name.includes("PDL1")) name = "PD-L1";
      if (name.includes("PD-1") || name.includes("PD1")) name = "PD-1";

      // Normalize status
      let status = b.status.toLowerCase().trim();
      if (status.includes("positive") || status.includes("mutated") || status === "+") {
        status = "positive";
      } else if (status.includes("negative") || status.includes("wild") || status === "-") {
        status = "negative";
      } else if (status.includes("%")) {
        // Keep percentage values as-is for PD-L1 TPS scores
        status = b.status.trim();
      }

      return { name, status };
    })
    .filter((b) => knownBiomarkers.some((known) => b.name.includes(known)));
}

// ============================================
// Public API Functions
// ============================================

/**
 * Process an uploaded document and extract sanitized patient data
 *
 * This function:
 * 1. Uploads the document to Reducto
 * 2. Extracts structured data using the Extract API
 * 3. Sanitizes the extraction to remove any PHI
 * 4. Returns only non-identifying medical information
 *
 * @param fileBuffer - The document file as a Buffer
 * @param filename - Original filename (used for MIME type detection)
 * @returns Sanitized extracted patient data
 */
export async function processDocument(fileBuffer: Buffer, filename: string): Promise<ExtractedPatientData> {
  try {
    // Log only operation start, never content
    console.log(`[Reducto] Processing document: ${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`);

    // Step 1: Upload to Reducto
    const fileId = await uploadToReducto(fileBuffer, filename);
    console.log("[Reducto] Document uploaded successfully");

    // Step 2: Extract structured data
    const rawResults = await extractFromReducto(fileId);
    console.log("[Reducto] Extraction completed");

    // Step 3: Sanitize the extracted data
    // Combine results if multiple pages/sections were extracted
    const combinedRaw: MedicalExtractionResult = rawResults.reduce(
      (acc, result) => ({
        medical_conditions: [...(acc.medical_conditions || []), ...(result.medical_conditions || [])],
        cancer_type: acc.cancer_type || result.cancer_type,
        cancer_stage: acc.cancer_stage || result.cancer_stage,
        biomarkers: [...(acc.biomarkers || []), ...(result.biomarkers || [])],
        prior_treatments: [...(acc.prior_treatments || []), ...(result.prior_treatments || [])],
        performance_status: acc.performance_status || result.performance_status,
        age_range: acc.age_range || result.age_range,
        gender: acc.gender || result.gender,
        smoking_status: acc.smoking_status || result.smoking_status,
      }),
      {} as MedicalExtractionResult
    );

    const sanitizedData = sanitizeExtractedData(combinedRaw);
    console.log("[Reducto] Data sanitized successfully");

    return sanitizedData;
  } catch (error) {
    // Log error without content details
    console.error("[Reducto] Document processing failed:", error instanceof Error ? error.message : "Unknown error");

    // Return empty data rather than crashing
    return {};
  }
}

/**
 * Sanitize extracted data to ensure no PHI is retained
 *
 * This function:
 * 1. Validates all fields against expected formats
 * 2. Normalizes values to predefined categories
 * 3. Removes any unexpected fields that might contain PHI
 * 4. Returns only structured, non-identifying medical data
 *
 * @param rawData - Raw extraction result from Reducto
 * @returns Sanitized patient data with only non-identifying fields
 */
export function sanitizeExtractedData(rawData: any): ExtractedPatientData {
  if (!rawData || typeof rawData !== "object") {
    return {};
  }

  const sanitized: ExtractedPatientData = {};

  // Sanitize age range - only allow predefined brackets
  const ageRange = normalizeAgeRange(rawData.age_range);
  if (ageRange) sanitized.ageRange = ageRange;

  // Sanitize gender - only allow predefined values
  const gender = normalizeGender(rawData.gender);
  if (gender) sanitized.gender = gender;

  // Sanitize smoking status - only allow predefined values
  const smokingStatus = normalizeSmokingStatus(rawData.smoking_status);
  if (smokingStatus) sanitized.smokingStatus = smokingStatus;

  // Sanitize medical conditions - keep any valid medical condition strings
  if (rawData.medical_conditions && Array.isArray(rawData.medical_conditions)) {
    const conditions = rawData.medical_conditions
      .filter((c: unknown): c is string => typeof c === "string" && c.length > 2 && c.length < 200)
      .map((c: string) => c.trim());
    if (conditions.length > 0) {
      sanitized.medicalConditions = conditions;
    }
  }

  // Sanitize cancer type - keep as-is if it's a valid string (expanded from lung cancer only)
  if (rawData.cancer_type && typeof rawData.cancer_type === "string") {
    const cancerType = rawData.cancer_type.trim();
    if (cancerType.length > 2 && cancerType.length < 100) {
      sanitized.cancerType = cancerType;
    }
  }

  // Sanitize cancer stage - only keep stage designation
  if (rawData.cancer_stage && typeof rawData.cancer_stage === "string") {
    const stage = rawData.cancer_stage.toLowerCase();
    const stagePatterns = [
      /stage\s*(i{1,3}v?|iv|[1-4])[a-c]?/i,
      /\b(early|advanced|metastatic|localized|regional)\b/i,
    ];

    for (const pattern of stagePatterns) {
      const match = stage.match(pattern);
      if (match) {
        sanitized.cancerStage = match[0].trim();
        break;
      }
    }
  }

  // Sanitize prior treatments - normalize to general categories
  const treatments = normalizeTreatments(rawData.prior_treatments);
  if (treatments.length > 0) {
    sanitized.priorTreatments = treatments;
  }

  // Sanitize biomarkers - only keep recognized biomarkers
  const biomarkers = normalizeBiomarkers(rawData.biomarkers);
  if (biomarkers && biomarkers.length > 0) {
    sanitized.biomarkers = biomarkers;
  }

  return sanitized;
}
