import { useState } from "react";
import { Activity, Cigarette, Info, Heart, Ruler, Scale, Scissors } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  StepProps,
  SMOKING_STATUS,
  PERFORMANCE_STATUS,
  GENERAL_HEALTH_RATING,
  ORGAN_FUNCTION_ISSUES
} from "./types";
import { TagInput } from "./TagInput";
import { cn } from "@/lib/utils";

export function HealthStatusStep({ formData, updateFormData }: StepProps) {
  const [heightUnit, setHeightUnit] = useState<"cm" | "ft">(formData.heightUnit || "cm");
  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">(formData.weightUnit || "kg");

  const handleOrganIssueChange = (value: string, checked: boolean) => {
    const current = formData.organFunctionIssues || [];

    if (value === "none" && checked) {
      // If "None" is selected, clear all other selections
      updateFormData({ organFunctionIssues: ["none"] });
    } else if (checked) {
      // Remove "none" if another option is selected
      const filtered = current.filter((v) => v !== "none");
      updateFormData({ organFunctionIssues: [...filtered, value] });
    } else {
      updateFormData({ organFunctionIssues: current.filter((v) => v !== value) });
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <Heart className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground">Health Status</h2>
        <p className="text-muted-foreground mt-2">
          Current health details help determine trial eligibility
        </p>
      </div>

      {/* Smoking Status */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2 text-base">
          <Cigarette className="w-4 h-4 text-muted-foreground" />
          Smoking Status
        </Label>
        <Select
          value={formData.smokingStatus || ""}
          onValueChange={(value) => updateFormData({ smokingStatus: value })}
        >
          <SelectTrigger className="h-11">
            <SelectValue placeholder="Select your smoking status" />
          </SelectTrigger>
          <SelectContent>
            {SMOKING_STATUS.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* General Health Rating */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2 text-base">
          <Heart className="w-4 h-4 text-muted-foreground" />
          General Health Rating
        </Label>
        <Select
          value={formData.generalHealthRating || ""}
          onValueChange={(value) => updateFormData({ generalHealthRating: value })}
        >
          <SelectTrigger className="h-11">
            <SelectValue placeholder="How would you rate your overall health?" />
          </SelectTrigger>
          <SelectContent>
            {GENERAL_HEALTH_RATING.map((rating) => (
              <SelectItem key={rating.value} value={rating.value}>
                {rating.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Performance Status (ECOG) */}
      <div className="space-y-4">
        <div className="flex items-start gap-2">
          <Label className="flex items-center gap-2 text-base">
            <Activity className="w-4 h-4 text-muted-foreground" />
            Performance Status (ECOG Scale)
          </Label>
        </div>
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm">
          <Info className="w-4 h-4 text-primary flex-shrink-0" />
          <p className="text-muted-foreground">
            The ECOG scale measures your general ability to perform daily activities. Select the option that best describes your current status.
          </p>
        </div>
        <RadioGroup
          value={formData.performanceStatus || ""}
          onValueChange={(value) => updateFormData({ performanceStatus: value })}
          className="space-y-3"
        >
          {PERFORMANCE_STATUS.map((status) => (
            <label
              key={status.value}
              className={cn(
                "flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all",
                formData.performanceStatus === status.value
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
              )}
            >
              <RadioGroupItem value={status.value} className="mt-1" />
              <div className="flex-1">
                <p className="font-medium text-foreground">{status.label}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {status.description}
                </p>
              </div>
            </label>
          ))}
        </RadioGroup>
      </div>

      {/* Major Organ Function Issues */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2 text-base">
          Major Organ Function Issues
        </Label>
        <div className="grid gap-3 sm:grid-cols-2">
          {ORGAN_FUNCTION_ISSUES.map((issue) => {
            const isChecked = (formData.organFunctionIssues || []).includes(issue.value);
            return (
              <label
                key={issue.value}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                  isChecked
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={(checked) =>
                    handleOrganIssueChange(issue.value, checked as boolean)
                  }
                />
                <span className="text-sm font-medium">{issue.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Major Surgeries */}
      <div className="space-y-2">
        <Label htmlFor="majorSurgeries" className="flex items-center gap-2">
          <Scissors className="w-4 h-4 text-muted-foreground" />
          Major Operations/Surgeries
        </Label>
        <TagInput
          id="majorSurgeries"
          value={formData.majorSurgeries || []}
          onChange={(tags) => updateFormData({ majorSurgeries: tags })}
          placeholder="Type surgery name and press Enter"
        />
      </div>

      {/* Height and Weight */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Height */}
        <div className="space-y-2">
          <Label htmlFor="height" className="flex items-center gap-2">
            <Ruler className="w-4 h-4 text-muted-foreground" />
            Height
          </Label>
          <div className="flex gap-2">
            <Input
              id="height"
              type="number"
              placeholder={heightUnit === "cm" ? "170" : "5.7"}
              step={heightUnit === "cm" ? 1 : 0.1}
              value={formData.height || ""}
              onChange={(e) => {
                const value = e.target.value;
                updateFormData({
                  height: value ? parseFloat(value) : undefined,
                  heightUnit
                });
              }}
              className="h-11 flex-1"
            />
            <div className="flex rounded-md border border-input overflow-hidden">
              <Button
                type="button"
                variant={heightUnit === "cm" ? "default" : "ghost"}
                size="sm"
                className="rounded-none h-11 px-3"
                onClick={() => {
                  setHeightUnit("cm");
                  updateFormData({ heightUnit: "cm" });
                }}
              >
                cm
              </Button>
              <Button
                type="button"
                variant={heightUnit === "ft" ? "default" : "ghost"}
                size="sm"
                className="rounded-none h-11 px-3"
                onClick={() => {
                  setHeightUnit("ft");
                  updateFormData({ heightUnit: "ft" });
                }}
              >
                ft
              </Button>
            </div>
          </div>
        </div>

        {/* Weight */}
        <div className="space-y-2">
          <Label htmlFor="weight" className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-muted-foreground" />
            Weight
          </Label>
          <div className="flex gap-2">
            <Input
              id="weight"
              type="number"
              placeholder={weightUnit === "kg" ? "70" : "154"}
              value={formData.weight || ""}
              onChange={(e) => {
                const value = e.target.value;
                updateFormData({
                  weight: value ? parseFloat(value) : undefined,
                  weightUnit
                });
              }}
              className="h-11 flex-1"
            />
            <div className="flex rounded-md border border-input overflow-hidden">
              <Button
                type="button"
                variant={weightUnit === "kg" ? "default" : "ghost"}
                size="sm"
                className="rounded-none h-11 px-3"
                onClick={() => {
                  setWeightUnit("kg");
                  updateFormData({ weightUnit: "kg" });
                }}
              >
                kg
              </Button>
              <Button
                type="button"
                variant={weightUnit === "lbs" ? "default" : "ghost"}
                size="sm"
                className="rounded-none h-11 px-3"
                onClick={() => {
                  setWeightUnit("lbs");
                  updateFormData({ weightUnit: "lbs" });
                }}
              >
                lbs
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
