import { Activity, Stethoscope, Pill, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StepProps, PREGNANCY_STATUS } from "./types";
import { TagInput } from "./TagInput";

export function MedicalHistoryStep({ formData, updateFormData }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <Activity className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground">Medical History</h2>
        <p className="text-muted-foreground mt-2">
          Tell us about your diagnosis and current medications
        </p>
      </div>

      <div className="space-y-6">
        {/* Primary Diagnosis */}
        <div className="space-y-2">
          <Label htmlFor="primaryDiagnosis" className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-muted-foreground" />
            Primary Diagnosis or Condition of Interest
          </Label>
          <Input
            id="primaryDiagnosis"
            type="text"
            placeholder="e.g., Non-small cell lung cancer, Stage IIIB"
            value={formData.primaryDiagnosis || ""}
            onChange={(e) => updateFormData({ primaryDiagnosis: e.target.value })}
            className="h-11"
          />
          <p className="text-xs text-muted-foreground">
            Be as specific as possible for better trial matching
          </p>
        </div>

        {/* Current Medications */}
        <div className="space-y-2">
          <Label htmlFor="currentMedications" className="flex items-center gap-2">
            <Pill className="w-4 h-4 text-muted-foreground" />
            Current Medications
          </Label>
          <TagInput
            id="currentMedications"
            value={formData.currentMedications || []}
            onChange={(tags) => updateFormData({ currentMedications: tags })}
            placeholder="Type medication name and press Enter"
          />
        </div>

        {/* Known Allergies */}
        <div className="space-y-2">
          <Label htmlFor="knownAllergies" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
            Known Allergies
          </Label>
          <TagInput
            id="knownAllergies"
            value={formData.knownAllergies || []}
            onChange={(tags) => updateFormData({ knownAllergies: tags })}
            placeholder="Type allergy and press Enter"
          />
        </div>

        {/* Drug Allergies */}
        <div className="space-y-2">
          <Label htmlFor="drugAllergies" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
            Drug Allergies (Specifically)
          </Label>
          <TagInput
            id="drugAllergies"
            value={formData.drugAllergies || []}
            onChange={(tags) => updateFormData({ drugAllergies: tags })}
            placeholder="Type drug allergy and press Enter"
          />
          <p className="text-xs text-muted-foreground">
            List any medications you are allergic to
          </p>
        </div>

        {/* Pregnancy Status */}
        <div className="space-y-2">
          <Label htmlFor="pregnancyStatus" className="flex items-center gap-2">
            Pregnancy Status
          </Label>
          <Select
            value={formData.pregnancyStatus || ""}
            onValueChange={(value) => updateFormData({ pregnancyStatus: value })}
          >
            <SelectTrigger id="pregnancyStatus" className="h-11">
              <SelectValue placeholder="Select pregnancy status" />
            </SelectTrigger>
            <SelectContent>
              {PREGNANCY_STATUS.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
