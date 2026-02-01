import {
  ClipboardCheck,
  Edit2,
  User,
  FileText,
  Upload,
  Loader2,
  Heart,
  Pill,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ReviewStepProps,
  US_STATES,
  SEX_AT_BIRTH,
  RACE_OPTIONS,
  ETHNICITY_OPTIONS,
  SMOKING_STATUS,
  PERFORMANCE_STATUS,
  PREGNANCY_STATUS,
  GENERAL_HEALTH_RATING,
  ORGAN_FUNCTION_ISSUES,
} from "./types";
import { cn } from "@/lib/utils";

interface ReviewSectionProps {
  title: string;
  icon: React.ReactNode;
  stepNumber: number;
  onEdit: () => void;
  children: React.ReactNode;
}

function ReviewSection({
  title,
  icon,
  onEdit,
  children,
}: ReviewSectionProps) {
  return (
    <div className="p-4 rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-medium text-foreground">{title}</h3>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="h-8 text-primary hover:text-primary"
        >
          <Edit2 className="w-3.5 h-3.5 mr-1" />
          Edit
        </Button>
      </div>
      {children}
    </div>
  );
}

export function ReviewStep({
  formData,
  uploadedFile,
  onGoToStep,
  onSubmit,
  isSubmitting,
}: ReviewStepProps) {
  const getStateName = (code: string) =>
    US_STATES.find((s) => s.value === code)?.label || code;

  const getSexAtBirthLabel = (value: string) =>
    SEX_AT_BIRTH.find((s) => s.value === value)?.label || value;

  const getRaceLabel = (value: string) =>
    RACE_OPTIONS.find((r) => r.value === value)?.label || value;

  const getEthnicityLabel = (value: string) =>
    ETHNICITY_OPTIONS.find((e) => e.value === value)?.label || value;

  const getSmokingLabel = (value: string) =>
    SMOKING_STATUS.find((s) => s.value === value)?.label || value;

  const getPerformanceLabel = (value: string) => {
    const status = PERFORMANCE_STATUS.find((p) => p.value === value);
    return status ? `${status.label} - ${status.description}` : value;
  };

  const getPregnancyLabel = (value: string) =>
    PREGNANCY_STATUS.find((p) => p.value === value)?.label || value;

  const getHealthRatingLabel = (value: string) =>
    GENERAL_HEALTH_RATING.find((h) => h.value === value)?.label || value;

  const getOrganIssueLabel = (value: string) =>
    ORGAN_FUNCTION_ISSUES.find((o) => o.value === value)?.label || value;

  const formatHeight = () => {
    if (!formData.height) return "Not provided";
    return `${formData.height} ${formData.heightUnit || "cm"}`;
  };

  const formatWeight = () => {
    if (!formData.weight) return "Not provided";
    return `${formData.weight} ${formData.weightUnit || "kg"}`;
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <ClipboardCheck className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground">Review Your Information</h2>
        <p className="text-muted-foreground mt-2">
          Please review your information before submitting
        </p>
      </div>

      <div className="space-y-4">
        {/* Demographics */}
        <ReviewSection
          title="Demographics"
          icon={<User className="w-4 h-4 text-muted-foreground" />}
          stepNumber={1}
          onEdit={() => onGoToStep(1)}
        >
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <span className="text-muted-foreground">Age:</span>{" "}
              <span className="text-foreground font-medium">
                {formData.age || (formData.dateOfBirth ? `DOB: ${formData.dateOfBirth}` : "Not provided")}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Sex at Birth:</span>{" "}
              <span className="text-foreground font-medium">
                {getSexAtBirthLabel(formData.sexAtBirth || "")}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Race:</span>{" "}
              <span className="text-foreground font-medium">
                {getRaceLabel(formData.race || "")}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Ethnicity:</span>{" "}
              <span className="text-foreground font-medium">
                {getEthnicityLabel(formData.ethnicity || "")}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">State:</span>{" "}
              <span className="text-foreground font-medium">
                {getStateName(formData.state || "")}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Email:</span>{" "}
              <span className="text-foreground font-medium">{formData.email}</span>
            </div>
          </div>
        </ReviewSection>

        {/* Medical History */}
        <ReviewSection
          title="Medical History"
          icon={<Pill className="w-4 h-4 text-muted-foreground" />}
          stepNumber={2}
          onEdit={() => onGoToStep(2)}
        >
          <div className="space-y-3 text-sm">
            {formData.primaryDiagnosis && (
              <div>
                <span className="text-muted-foreground">Primary Diagnosis:</span>{" "}
                <span className="text-foreground font-medium">{formData.primaryDiagnosis}</span>
              </div>
            )}
            {formData.currentMedications && formData.currentMedications.length > 0 && (
              <div>
                <span className="text-muted-foreground block mb-1">Current Medications:</span>
                <div className="flex flex-wrap gap-1">
                  {formData.currentMedications.map((med) => (
                    <Badge key={med} variant="secondary" className="py-0.5 px-2 text-xs">
                      {med}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {formData.knownAllergies && formData.knownAllergies.length > 0 && (
              <div>
                <span className="text-muted-foreground block mb-1">Known Allergies:</span>
                <div className="flex flex-wrap gap-1">
                  {formData.knownAllergies.map((allergy) => (
                    <Badge key={allergy} variant="secondary" className="py-0.5 px-2 text-xs">
                      {allergy}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {formData.drugAllergies && formData.drugAllergies.length > 0 && (
              <div>
                <span className="text-muted-foreground block mb-1">Drug Allergies:</span>
                <div className="flex flex-wrap gap-1">
                  {formData.drugAllergies.map((drug) => (
                    <Badge key={drug} variant="destructive" className="py-0.5 px-2 text-xs">
                      {drug}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {formData.pregnancyStatus && (
              <div>
                <span className="text-muted-foreground">Pregnancy Status:</span>{" "}
                <span className="text-foreground font-medium">
                  {getPregnancyLabel(formData.pregnancyStatus)}
                </span>
              </div>
            )}
            {!formData.primaryDiagnosis &&
              (!formData.currentMedications || formData.currentMedications.length === 0) &&
              (!formData.knownAllergies || formData.knownAllergies.length === 0) &&
              (!formData.drugAllergies || formData.drugAllergies.length === 0) &&
              !formData.pregnancyStatus && (
              <p className="text-muted-foreground italic">No medical history provided</p>
            )}
          </div>
        </ReviewSection>

        {/* Health Status */}
        <ReviewSection
          title="Health Status"
          icon={<Heart className="w-4 h-4 text-muted-foreground" />}
          stepNumber={3}
          onEdit={() => onGoToStep(3)}
        >
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Smoking Status:</span>{" "}
              <span className="text-foreground font-medium">
                {getSmokingLabel(formData.smokingStatus || "")}
              </span>
            </div>
            {formData.generalHealthRating && (
              <div>
                <span className="text-muted-foreground">General Health:</span>{" "}
                <span className="text-foreground font-medium">
                  {getHealthRatingLabel(formData.generalHealthRating)}
                </span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Performance Status:</span>{" "}
              <span className="text-foreground font-medium">
                {getPerformanceLabel(formData.performanceStatus || "")}
              </span>
            </div>
            {formData.organFunctionIssues && formData.organFunctionIssues.length > 0 && (
              <div>
                <span className="text-muted-foreground block mb-1">Organ Function Issues:</span>
                <div className="flex flex-wrap gap-1">
                  {formData.organFunctionIssues.map((issue) => (
                    <Badge key={issue} variant="secondary" className="py-0.5 px-2 text-xs">
                      {getOrganIssueLabel(issue)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {formData.majorSurgeries && formData.majorSurgeries.length > 0 && (
              <div>
                <span className="text-muted-foreground block mb-1">Major Surgeries:</span>
                <div className="flex flex-wrap gap-1">
                  {formData.majorSurgeries.map((surgery) => (
                    <Badge key={surgery} variant="secondary" className="py-0.5 px-2 text-xs">
                      {surgery}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-4">
              <div>
                <span className="text-muted-foreground">Height:</span>{" "}
                <span className="text-foreground font-medium">{formatHeight()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Weight:</span>{" "}
                <span className="text-foreground font-medium">{formatWeight()}</span>
              </div>
            </div>
          </div>
        </ReviewSection>

        {/* Condition Description */}
        <ReviewSection
          title="Condition Information"
          icon={<FileText className="w-4 h-4 text-muted-foreground" />}
          stepNumber={4}
          onEdit={() => onGoToStep(4)}
        >
          <div className="space-y-3">
            {formData.conditionDescription ? (
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {formData.conditionDescription}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">No condition description provided</p>
            )}
            {(formData.conditions || []).length > 0 && (
              <div>
                <span className="text-muted-foreground text-sm block mb-1">AI-Parsed Conditions:</span>
                <div className="flex flex-wrap gap-2">
                  {(formData.conditions || []).map((condition) => (
                    <Badge
                      key={condition}
                      variant="secondary"
                      className="py-1 px-2.5"
                    >
                      {condition}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ReviewSection>

        {/* Uploaded Document */}
        <ReviewSection
          title="Uploaded Document"
          icon={<Upload className="w-4 h-4 text-muted-foreground" />}
          stepNumber={5}
          onEdit={() => onGoToStep(5)}
        >
          {uploadedFile ? (
            <div className="flex items-center gap-3 text-sm">
              <FileText className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium text-foreground">{uploadedFile.name}</p>
                <p className="text-muted-foreground">
                  {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No document uploaded</p>
          )}
        </ReviewSection>
      </div>

      {/* Submit button */}
      <div className="pt-4">
        <Button
          type="button"
          size="lg"
          onClick={onSubmit}
          disabled={isSubmitting}
          className={cn(
            "w-full h-14 text-base font-semibold",
            "bg-primary hover:bg-primary/90"
          )}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Finding Your Matches...
            </>
          ) : (
            "Find My Clinical Trial Matches"
          )}
        </Button>
      </div>
    </div>
  );
}
