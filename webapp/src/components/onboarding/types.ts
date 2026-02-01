import { z } from "zod";

// Form validation schema for the entire wizard
export const onboardingSchema = z.object({
  // Step 1: Demographics
  age: z.number().min(18, "Must be at least 18 years old").max(120, "Please enter a valid age").optional(),
  dateOfBirth: z.string().optional(),
  sexAtBirth: z.string().min(1, "Please select sex assigned at birth"),
  race: z.string().min(1, "Please select your race"),
  ethnicity: z.string().min(1, "Please select your ethnicity"),
  state: z.string().length(2, "Please select your state"),
  email: z.string().email("Please enter a valid email address"),

  // Step 2: Medical History
  primaryDiagnosis: z.string().optional(),
  currentMedications: z.array(z.string()).default([]),
  knownAllergies: z.array(z.string()).default([]),
  drugAllergies: z.array(z.string()).default([]),
  pregnancyStatus: z.string().optional(),

  // Step 3: Health Status
  smokingStatus: z.string().min(1, "Please select your smoking status"),
  generalHealthRating: z.string().optional(),
  performanceStatus: z.string().min(1, "Please select your performance status"),
  organFunctionIssues: z.array(z.string()).default([]),
  majorSurgeries: z.array(z.string()).default([]),
  height: z.number().optional(),
  heightUnit: z.enum(["cm", "ft"]).default("cm"),
  weight: z.number().optional(),
  weightUnit: z.enum(["kg", "lbs"]).default("kg"),

  // Step 4: Condition description (conditions parsed by AI)
  conditions: z.array(z.string()).default([]),
  conditionDescription: z.string().optional(),
});

export type OnboardingFormData = z.infer<typeof onboardingSchema>;

// Step definitions - updated for 6 steps (removed separate conditions step)
export const WIZARD_STEPS = [
  { id: 1, title: "Demographics", description: "Personal information" },
  { id: 2, title: "Medical History", description: "Your health background" },
  { id: 3, title: "Health Status", description: "Current health details" },
  { id: 4, title: "Condition", description: "Describe your condition" },
  { id: 5, title: "Documents", description: "Upload medical records" },
  { id: 6, title: "Review", description: "Confirm your information" },
] as const;

export type StepId = (typeof WIZARD_STEPS)[number]["id"];

// US States with codes
export const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
];

// Legacy GENDERS for backward compatibility
export const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer-not-to-say", label: "Prefer not to say" },
];

// Sex assigned at birth options (biological sex for medical purposes)
export const SEX_AT_BIRTH = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "intersex", label: "Intersex" },
];

// Race options
export const RACE_OPTIONS = [
  { value: "white", label: "White" },
  { value: "black", label: "Black or African American" },
  { value: "asian", label: "Asian" },
  { value: "american-indian", label: "American Indian or Alaska Native" },
  { value: "pacific-islander", label: "Native Hawaiian or Pacific Islander" },
  { value: "multiple", label: "Multiple races" },
  { value: "other", label: "Other" },
  { value: "prefer-not-to-say", label: "Prefer not to say" },
];

// Ethnicity options
export const ETHNICITY_OPTIONS = [
  { value: "hispanic-latino", label: "Hispanic or Latino" },
  { value: "not-hispanic-latino", label: "Not Hispanic or Latino" },
  { value: "prefer-not-to-say", label: "Prefer not to say" },
];

// Pregnancy status options
// Pregnancy status options
export const PREGNANCY_STATUS = [
  { value: "not_pregnant", label: "Not pregnant" },
  { value: "pregnant", label: "Currently pregnant" },
  { value: "possibly_pregnant", label: "Possibly pregnant" },
  { value: "not_applicable", label: "Not applicable" },
];

// General health rating
export const GENERAL_HEALTH_RATING = [
  { value: "excellent", label: "Excellent" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
];

// Organ function issues
export const ORGAN_FUNCTION_ISSUES = [
  { value: "kidney", label: "Kidney disease" },
  { value: "liver", label: "Liver disease" },
  { value: "heart", label: "Heart disease" },
  { value: "lung", label: "Lung disease" },
  { value: "none", label: "None" },
];

export const SMOKING_STATUS = [
  { value: "never", label: "Never smoked" },
  { value: "former", label: "Former smoker" },
  { value: "current", label: "Current smoker" },
];

export const PERFORMANCE_STATUS = [
  { value: "0", label: "ECOG 0", description: "Fully active, able to carry on all pre-disease activities" },
  { value: "1", label: "ECOG 1", description: "Restricted but ambulatory, able to do light work" },
  { value: "2", label: "ECOG 2", description: "Ambulatory and capable of self-care, but unable to work" },
  { value: "3", label: "ECOG 3", description: "Limited self-care, confined to bed or chair >50% of waking hours" },
  { value: "4", label: "ECOG 4", description: "Completely disabled, cannot carry on any self-care" },
];

// Condition categories with expanded conditions
export const CONDITION_CATEGORIES = {
  Cancer: [
    "Lung Cancer",
    "Breast Cancer",
    "Prostate Cancer",
    "Colorectal Cancer",
    "Melanoma",
    "Leukemia",
    "Lymphoma",
    "Pancreatic Cancer",
    "Ovarian Cancer",
    "Brain Cancer",
    "Liver Cancer",
    "Kidney Cancer",
    "Bladder Cancer",
    "Thyroid Cancer",
    "Other Cancer",
  ],
  Cardiovascular: [
    "Heart Disease",
    "Heart Failure",
    "Arrhythmia",
    "Coronary Artery Disease",
    "Hypertension",
    "Stroke",
  ],
  Neurological: [
    "Alzheimer's",
    "Parkinson's",
    "Multiple Sclerosis",
    "Epilepsy",
    "ALS",
  ],
  Autoimmune: [
    "Rheumatoid Arthritis",
    "Lupus",
    "Crohn's Disease",
    "Ulcerative Colitis",
    "Psoriasis",
  ],
  Respiratory: [
    "COPD",
    "Asthma",
    "Pulmonary Fibrosis",
    "Cystic Fibrosis",
  ],
  Other: [
    "Diabetes",
    "Chronic Kidney Disease",
    "HIV/AIDS",
    "Hepatitis",
  ],
} as const;

export type ConditionCategory = keyof typeof CONDITION_CATEGORIES;

// Props for step components
export interface StepProps {
  formData: Partial<OnboardingFormData>;
  updateFormData: (data: Partial<OnboardingFormData>) => void;
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

export interface StepWithFileProps extends StepProps {
  uploadedFile: File | null;
  setUploadedFile: (file: File | null) => void;
}

export interface ReviewStepProps extends StepWithFileProps {
  onGoToStep: (step: number) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}
