import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

import { DemographicsStep } from "./DemographicsStep";
import { MedicalHistoryStep } from "./MedicalHistoryStep";
import { HealthStatusStep } from "./HealthStatusStep";
import { DescribeConditionStep } from "./DescribeConditionStep";
import { DocumentUploadStep } from "./DocumentUploadStep";
import { ReviewStep } from "./ReviewStep";
import { MatchingFlow } from "./MatchingFlow";
import { OnboardingFormData, WIZARD_STEPS } from "./types";
import { cn } from "@/lib/utils";

interface PatientResponse {
  patientId: string;
}

// Helper to get missing fields for each step
function getMissingFields(step: number, formData: Partial<OnboardingFormData>): string[] {
  const missing: string[] = [];

  switch (step) {
    case 1: // Demographics
      if (!formData.age && !formData.dateOfBirth) missing.push("Age or Date of Birth");
      if (!formData.sexAtBirth) missing.push("Sex assigned at birth");
      if (!formData.race) missing.push("Race");
      if (!formData.ethnicity) missing.push("Ethnicity");
      if (!formData.state) missing.push("State");
      if (!formData.email || !formData.email.includes("@")) missing.push("Valid email");
      break;
    case 3: // Health Status
      if (!formData.smokingStatus) missing.push("Smoking status");
      if (!formData.performanceStatus) missing.push("Performance status (ECOG)");
      break;
  }

  return missing;
}

export function OnboardingWizard() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<OnboardingFormData>>({
    conditions: [],
    currentMedications: [],
    knownAllergies: [],
    drugAllergies: [],
    organFunctionIssues: [],
    majorSurgeries: [],
    heightUnit: "cm",
    weightUnit: "kg",
  });
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [patientId, setPatientId] = useState<string | null>(null);

  const updateFormData = useCallback((data: Partial<OnboardingFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  }, []);

  // Calculate overall progress
  const progress = Math.round((currentStep / WIZARD_STEPS.length) * 100);

  // Validation for each step
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1: // Demographics
        return !!(
          (formData.age || formData.dateOfBirth) &&
          formData.sexAtBirth &&
          formData.race &&
          formData.ethnicity &&
          formData.state &&
          formData.email &&
          formData.email.includes("@")
        );
      case 2: // Medical History
        return true; // All fields are optional
      case 3: // Health Status
        return !!(formData.smokingStatus && formData.performanceStatus);
      case 4: // Describe Condition
        return true; // Description is optional
      case 5: // Documents
        return true; // Document is optional
      case 6: // Review
        return true;
      default:
        return false;
    }
  };

  const goToStep = (step: number) => {
    if (step >= 1 && step <= WIZARD_STEPS.length) {
      setCurrentStep(step);
    }
  };

  const goNext = () => {
    if (!isStepValid(currentStep)) {
      const missing = getMissingFields(currentStep, formData);
      if (missing.length > 0) {
        toast.error(`Please fill in: ${missing.join(", ")}`);
      }
      return;
    }
    if (currentStep < WIZARD_STEPS.length) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Create patient mutation
  const createPatientMutation = useMutation({
    mutationFn: async (
      data: Partial<OnboardingFormData> & { file?: File }
    ) => {
      const formPayload = new FormData();

      // Demographics - compute age from DOB if needed
      let ageToSend = data.age;
      if (!ageToSend && data.dateOfBirth) {
        const dob = new Date(data.dateOfBirth);
        const today = new Date();
        ageToSend = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
          ageToSend--;
        }
      }

      if (ageToSend) formPayload.append("age", String(ageToSend));
      if (data.dateOfBirth) formPayload.append("dateOfBirth", data.dateOfBirth);

      // Map sexAtBirth to gender for backend compatibility
      formPayload.append("gender", data.sexAtBirth || "");
      formPayload.append("sexAtBirth", data.sexAtBirth || "");
      formPayload.append("race", data.race || "");
      formPayload.append("ethnicity", data.ethnicity || "");
      formPayload.append("state", data.state || "");
      formPayload.append("email", data.email || "");

      // Medical History
      if (data.primaryDiagnosis) formPayload.append("primaryDiagnosis", data.primaryDiagnosis);
      formPayload.append("currentMedications", JSON.stringify(data.currentMedications || []));
      formPayload.append("knownAllergies", JSON.stringify(data.knownAllergies || []));
      formPayload.append("drugAllergies", JSON.stringify(data.drugAllergies || []));
      if (data.pregnancyStatus) formPayload.append("pregnancyStatus", data.pregnancyStatus);

      // Health Status
      formPayload.append("smokingStatus", data.smokingStatus || "");
      if (data.generalHealthRating) formPayload.append("generalHealthRating", data.generalHealthRating);
      if (data.performanceStatus) formPayload.append("performanceStatus", data.performanceStatus);
      formPayload.append("organFunctionIssues", JSON.stringify(data.organFunctionIssues || []));
      formPayload.append("majorSurgeries", JSON.stringify(data.majorSurgeries || []));

      // Convert height/weight to cm/kg for storage
      let heightCm = data.height;
      if (heightCm && data.heightUnit === "ft") {
        heightCm = Math.round(heightCm * 30.48); // ft to cm
      }
      let weightKg = data.weight;
      if (weightKg && data.weightUnit === "lbs") {
        weightKg = Math.round(weightKg * 0.453592); // lbs to kg
      }

      if (heightCm) formPayload.append("heightCm", String(heightCm));
      if (weightKg) formPayload.append("weightKg", String(weightKg));

      // Conditions from AI parsing
      formPayload.append("conditions", JSON.stringify(data.conditions || []));
      if (data.conditionDescription) {
        formPayload.append("conditionDescription", data.conditionDescription);
      }

      if (data.file) {
        formPayload.append("document", data.file);
      }

      const response = await api.raw("/api/patients", {
        method: "POST",
        body: formPayload,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.error?.message || "Failed to submit patient information"
        );
      }

      const json = await response.json();
      return json.data as PatientResponse;
    },
  });

  const handleSubmit = async () => {
    try {
      // Create patient first
      const patient = await createPatientMutation.mutateAsync({
        ...formData,
        file: uploadedFile || undefined,
      });

      // Store patient ID and show matching flow
      setPatientId(patient.patientId);
      setIsMatching(true);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    }
  };

  const handleMatchingComplete = (matchCount: number) => {
    toast.success(`Found ${matchCount} matching trials!`);
    if (patientId) {
      navigate(`/results/${patientId}`);
    }
  };

  const handleMatchingError = (error: string) => {
    setIsMatching(false);
    setPatientId(null);
    toast.error(error);
  };

  const isSubmitting = createPatientMutation.isPending || isMatching;

  // Render matching flow screen
  if (isMatching && patientId) {
    return (
      <MatchingFlow
        patientId={patientId}
        onComplete={handleMatchingComplete}
        onError={handleMatchingError}
      />
    );
  }

  // Render step content
  const renderStepContent = () => {
    const stepProps = {
      formData,
      updateFormData,
      onNext: goNext,
      onBack: goBack,
      isFirstStep: currentStep === 1,
      isLastStep: currentStep === WIZARD_STEPS.length,
    };

    switch (currentStep) {
      case 1:
        return <DemographicsStep {...stepProps} />;
      case 2:
        return <MedicalHistoryStep {...stepProps} />;
      case 3:
        return <HealthStatusStep {...stepProps} />;
      case 4:
        return <DescribeConditionStep {...stepProps} />;
      case 5:
        return (
          <DocumentUploadStep
            {...stepProps}
            uploadedFile={uploadedFile}
            setUploadedFile={setUploadedFile}
          />
        );
      case 6:
        return (
          <ReviewStep
            {...stepProps}
            uploadedFile={uploadedFile}
            setUploadedFile={setUploadedFile}
            onGoToStep={goToStep}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Step indicators */}
      <div className="mb-8">
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>
              Step {currentStep} of {WIZARD_STEPS.length}
            </span>
            <span>{progress}% complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step indicators - desktop */}
        <div className="hidden md:flex items-center justify-between">
          {WIZARD_STEPS.map((step, index) => {
            const isActive = step.id === currentStep;
            const isCompleted = step.id < currentStep;
            const isClickable = step.id < currentStep;

            return (
              <div key={step.id} className="flex items-center">
                <button
                  type="button"
                  onClick={() => isClickable && goToStep(step.id)}
                  disabled={!isClickable}
                  className={cn(
                    "flex flex-col items-center",
                    isClickable && "cursor-pointer"
                  )}
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                      isActive
                        ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                        : isCompleted
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {isCompleted ? <Check className="w-5 h-5" /> : step.id}
                  </div>
                  <span
                    className={cn(
                      "mt-2 text-xs font-medium",
                      isActive
                        ? "text-primary"
                        : isCompleted
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {step.title}
                  </span>
                </button>
                {index < WIZARD_STEPS.length - 1 && (
                  <div
                    className={cn(
                      "flex-1 h-0.5 mx-3 mt-[-1rem]",
                      step.id < currentStep ? "bg-primary" : "bg-muted"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step indicators - mobile */}
        <div className="flex md:hidden items-center justify-center gap-2">
          {WIZARD_STEPS.map((step) => {
            const isActive = step.id === currentStep;
            const isCompleted = step.id < currentStep;

            return (
              <div
                key={step.id}
                className={cn(
                  "h-2.5 rounded-full transition-all duration-300",
                  isActive
                    ? "bg-primary w-8"
                    : isCompleted
                    ? "bg-primary w-2.5"
                    : "bg-muted w-2.5"
                )}
              />
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <Card className="shadow-lg border-border/50">
        <CardContent className="p-6 md:p-8">
          <div
            key={currentStep}
            className="animate-in fade-in slide-in-from-right-4 duration-300"
          >
            {renderStepContent()}
          </div>

          {/* Navigation buttons (not shown on review step) */}
          {currentStep !== 6 && (
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                onClick={goBack}
                disabled={currentStep === 1}
                className={cn(currentStep === 1 && "invisible")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>

              <Button
                type="button"
                onClick={goNext}
              >
                {currentStep === 5 ? "Review" : "Continue"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
