import { z } from "zod";

// ============================================
// Enums
// ============================================

export const GenderEnum = z.enum(["male", "female", "other"]);
export type Gender = z.infer<typeof GenderEnum>;

export const SmokingStatusEnum = z.enum(["never", "former", "current"]);
export type SmokingStatus = z.infer<typeof SmokingStatusEnum>;

// US State codes
export const USStateCodeEnum = z.enum([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
  "DC", "PR", "VI", "GU", "AS", "MP"
]);
export type USStateCode = z.infer<typeof USStateCodeEnum>;

// ============================================
// PatientProfile (sanitized - NO PHI)
// ============================================

export const PatientProfileSchema = z.object({
  id: z.string(),
  age: z.number().int().min(18).max(120).optional(), // Optional - may have ageRange instead
  ageRange: z.string().optional(), // e.g., "31-45" from document extraction
  gender: GenderEnum,
  smokingStatus: SmokingStatusEnum,
  state: USStateCodeEnum,
  email: z.string().email(),
  conditions: z.array(z.string()),
  createdAt: z.date(),
});
export type PatientProfile = z.infer<typeof PatientProfileSchema>;

// ECOG Performance Status (0-4)
export const PerformanceStatusEnum = z.enum(["0", "1", "2", "3", "4"]);
export type PerformanceStatus = z.infer<typeof PerformanceStatusEnum>;

// Sex at Birth enum
export const SexAtBirthEnum = z.enum(["male", "female", "intersex"]);
export type SexAtBirth = z.infer<typeof SexAtBirthEnum>;

// Pregnancy Status enum
export const PregnancyStatusEnum = z.enum(["not_pregnant", "pregnant", "possibly_pregnant", "not_applicable"]);
export type PregnancyStatus = z.infer<typeof PregnancyStatusEnum>;

// General Health Rating enum
export const GeneralHealthRatingEnum = z.enum(["excellent", "good", "fair", "poor"]);
export type GeneralHealthRating = z.infer<typeof GeneralHealthRatingEnum>;

// Schema for creating a new patient (without id and createdAt)
export const CreatePatientSchema = z.object({
  age: z.number().int().min(18).max(120),
  gender: GenderEnum,
  smokingStatus: SmokingStatusEnum,
  state: USStateCodeEnum,
  email: z.string().email(),
  conditions: z.array(z.string()),
  conditionDescription: z.string().optional(), // Free-text description of patient's condition
  performanceStatus: PerformanceStatusEnum.optional(), // ECOG score 0-4

  // Demographics
  dateOfBirth: z.string().optional(), // ISO date string
  sexAtBirth: SexAtBirthEnum.optional(),
  race: z.string().optional(),
  ethnicity: z.string().optional(),

  // Medical History
  primaryDiagnosis: z.string().optional(),
  currentMedications: z.array(z.string()).optional(),
  knownAllergies: z.array(z.string()).optional(),
  drugAllergies: z.array(z.string()).optional(),
  pregnancyStatus: PregnancyStatusEnum.optional(),

  // Health Status
  generalHealthRating: GeneralHealthRatingEnum.optional(),
  organFunctionIssues: z.array(z.string()).optional(), // kidney, liver, heart, etc.
  majorOperations: z.array(z.string()).optional(),
  heightCm: z.number().optional(),
  weightKg: z.number().optional(),
});
export type CreatePatientInput = z.infer<typeof CreatePatientSchema>;

// MongoDB document schema (dates stored as Date objects)
export const PatientDocumentSchema = z.object({
  _id: z.string(),
  age: z.number().int().min(18).max(120),
  gender: GenderEnum,
  smokingStatus: SmokingStatusEnum,
  state: USStateCodeEnum,
  email: z.string().email(),
  conditions: z.array(z.string()),
  conditionDescription: z.string().optional(), // Free-text description of patient's condition
  aiParsedConditions: z.array(z.string()).optional(), // AI-extracted conditions from the description
  performanceStatus: PerformanceStatusEnum.optional(), // ECOG score 0-4

  // Demographics
  dateOfBirth: z.string().optional(), // ISO date string
  sexAtBirth: SexAtBirthEnum.optional(),
  race: z.string().optional(),
  ethnicity: z.string().optional(),

  // Medical History
  primaryDiagnosis: z.string().optional(),
  currentMedications: z.array(z.string()).optional(),
  knownAllergies: z.array(z.string()).optional(),
  drugAllergies: z.array(z.string()).optional(),
  pregnancyStatus: PregnancyStatusEnum.optional(),

  // Health Status
  generalHealthRating: GeneralHealthRatingEnum.optional(),
  organFunctionIssues: z.array(z.string()).optional(), // kidney, liver, heart, etc.
  majorOperations: z.array(z.string()).optional(),
  heightCm: z.number().optional(),
  weightKg: z.number().optional(),

  createdAt: z.date(),
  updatedAt: z.date().optional(),
});
export type PatientDocument = z.infer<typeof PatientDocumentSchema>;

// ============================================
// ClinicalTrial
// ============================================

export const ClinicalTrialSchema = z.object({
  nctId: z.string().regex(/^NCT\d{8}$/, "Invalid NCT ID format"),
  title: z.string(),
  status: z.string(),
  conditions: z.array(z.string()),
  eligibilityCriteria: z.string(),
  url: z.string().url(),
  contactEmail: z.string().email().optional(),
  contactName: z.string().optional(),
  ingestedAt: z.date(),
});
export type ClinicalTrial = z.infer<typeof ClinicalTrialSchema>;

// MongoDB document schema
export const ClinicalTrialDocumentSchema = z.object({
  _id: z.string(), // Using nctId as _id
  nctId: z.string().regex(/^NCT\d{8}$/, "Invalid NCT ID format"),
  title: z.string(),
  status: z.string(),
  conditions: z.array(z.string()),
  eligibilityCriteria: z.string(),
  url: z.string().url(),
  contactEmail: z.string().email().optional(),
  contactName: z.string().optional(),
  ingestedAt: z.date(),
});
export type ClinicalTrialDocument = z.infer<typeof ClinicalTrialDocumentSchema>;

// Schema for ingesting a new trial (without ingestedAt)
export const IngestTrialSchema = z.object({
  nctId: z.string().regex(/^NCT\d{8}$/, "Invalid NCT ID format"),
  title: z.string(),
  status: z.string(),
  conditions: z.array(z.string()),
  eligibilityCriteria: z.string(),
  url: z.string().url(),
  contactEmail: z.string().email().optional(),
  contactName: z.string().optional(),
});
export type IngestTrialInput = z.infer<typeof IngestTrialSchema>;

// ============================================
// MatchResult
// ============================================

// Score color categories for match results
export const ScoreColorEnum = z.enum(["RED", "YELLOW", "GREEN", "BLUE"]);
export type ScoreColor = z.infer<typeof ScoreColorEnum>;

/**
 * Get the color category for a match score
 * 0-60 → RED (poor match)
 * 60-75 → YELLOW (moderate match)
 * 75-90 → GREEN (good match)
 * 90-100 → BLUE (excellent match)
 */
export function getScoreColor(score: number): ScoreColor {
  if (score >= 90) return "BLUE";
  if (score >= 75) return "GREEN";
  if (score >= 60) return "YELLOW";
  return "RED";
}

export const MatchResultSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  trialId: z.string(), // NCT ID
  confidenceScore: z.number().min(0).max(100),
  reasoning: z.string(),
  createdAt: z.date(),
});
export type MatchResult = z.infer<typeof MatchResultSchema>;

// MongoDB document schema
export const MatchResultDocumentSchema = z.object({
  _id: z.string(),
  patientId: z.string(),
  trialId: z.string(), // NCT ID
  confidenceScore: z.number().min(0).max(100),
  reasoning: z.string(),
  createdAt: z.date(),
});
export type MatchResultDocument = z.infer<typeof MatchResultDocumentSchema>;

// Schema for creating a new match result
export const CreateMatchResultSchema = z.object({
  patientId: z.string(),
  trialId: z.string(),
  confidenceScore: z.number().min(0).max(100),
  reasoning: z.string(),
});
export type CreateMatchResultInput = z.infer<typeof CreateMatchResultSchema>;

// ============================================
// DocumentUpload (for Reducto)
// ============================================

// Sanitized extracted data from medical documents
export const ExtractedPatientDataSchema = z.object({
  // These fields are derived/anonymized from documents
  age: z.number().int().min(18).max(120).optional(),
  ageRange: z.enum(["18-30", "31-45", "46-60", "61-75", "75+"]).optional(),
  gender: GenderEnum.optional(),
  smokingStatus: SmokingStatusEnum.optional(),
  // General medical conditions (any type)
  medicalConditions: z.array(z.string()).optional(),
  // Cancer-specific fields
  cancerType: z.string().optional(),
  cancerStage: z.string().optional(),
  // Treatment history (anonymized)
  priorTreatments: z.array(z.string()).optional(),
  // Biomarkers
  biomarkers: z.array(z.object({
    name: z.string(),
    status: z.string(),
  })).optional(),
});
export type ExtractedPatientData = z.infer<typeof ExtractedPatientDataSchema>;

export const DocumentUploadSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  documentType: z.enum(["medical_record", "lab_report", "pathology_report", "other"]),
  extractedData: ExtractedPatientDataSchema,
  uploadedAt: z.date(),
});
export type DocumentUpload = z.infer<typeof DocumentUploadSchema>;

// ============================================
// API Response Types
// ============================================

// Generic API response wrapper
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: dataSchema,
  });

// Error response
export const ApiErrorSchema = z.object({
  error: z.object({
    message: z.string(),
    code: z.string().optional(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

// ============================================
// Request Schemas
// ============================================

// Patient matching request
export const MatchPatientRequestSchema = z.object({
  patientId: z.string(),
});
export type MatchPatientRequest = z.infer<typeof MatchPatientRequestSchema>;

// Trial search request
export const SearchTrialsRequestSchema = z.object({
  state: USStateCodeEnum.optional(),
  status: z.string().optional(),
  condition: z.string().optional(),
  limit: z.number().min(1).max(100).optional().default(20),
  offset: z.number().min(0).optional().default(0),
});
export type SearchTrialsRequest = z.infer<typeof SearchTrialsRequestSchema>;

// Parse conditions request - for AI parsing of free-text condition description
export const ParseConditionsRequestSchema = z.object({
  description: z.string().min(1, "Description is required"),
});
export type ParseConditionsRequest = z.infer<typeof ParseConditionsRequestSchema>;

// Parse conditions response
export const ParseConditionsResponseSchema = z.object({
  conditions: z.array(z.string()),
});
export type ParseConditionsResponse = z.infer<typeof ParseConditionsResponseSchema>;
