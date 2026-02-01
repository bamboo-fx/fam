import { useState } from "react";
import { User, Mail, MapPin, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StepProps, US_STATES, SEX_AT_BIRTH, RACE_OPTIONS, ETHNICITY_OPTIONS } from "./types";

export function DemographicsStep({ formData, updateFormData }: StepProps) {
  const [useAge, setUseAge] = useState(true);

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <User className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground">Demographics</h2>
        <p className="text-muted-foreground mt-2">
          Personal information helps match you with appropriate trials
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Age or Date of Birth toggle */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="age" className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              {useAge ? "Age" : "Date of Birth"}
            </Label>
            <button
              type="button"
              onClick={() => setUseAge(!useAge)}
              className="text-xs text-primary hover:underline"
            >
              Use {useAge ? "date of birth" : "age"} instead
            </button>
          </div>
          {useAge ? (
            <Input
              id="age"
              type="number"
              placeholder="Enter your age"
              min={18}
              max={120}
              value={formData.age || ""}
              onChange={(e) => {
                const value = e.target.value;
                updateFormData({
                  age: value ? parseInt(value, 10) : undefined,
                  dateOfBirth: undefined
                });
              }}
              className="h-11"
            />
          ) : (
            <Input
              id="dateOfBirth"
              type="date"
              value={formData.dateOfBirth || ""}
              onChange={(e) => {
                updateFormData({
                  dateOfBirth: e.target.value,
                  age: undefined
                });
              }}
              className="h-11"
            />
          )}
        </div>

        {/* Sex Assigned at Birth */}
        <div className="space-y-2">
          <Label htmlFor="sexAtBirth" className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            Sex Assigned at Birth
          </Label>
          <Select
            value={formData.sexAtBirth || ""}
            onValueChange={(value) => updateFormData({ sexAtBirth: value })}
          >
            <SelectTrigger id="sexAtBirth" className="h-11">
              <SelectValue placeholder="Select sex assigned at birth" />
            </SelectTrigger>
            <SelectContent>
              {SEX_AT_BIRTH.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Biological sex is important for clinical trial eligibility
          </p>
        </div>

        {/* Race */}
        <div className="space-y-2">
          <Label htmlFor="race" className="flex items-center gap-2">
            Race
          </Label>
          <Select
            value={formData.race || ""}
            onValueChange={(value) => updateFormData({ race: value })}
          >
            <SelectTrigger id="race" className="h-11">
              <SelectValue placeholder="Select your race" />
            </SelectTrigger>
            <SelectContent>
              {RACE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Ethnicity */}
        <div className="space-y-2">
          <Label htmlFor="ethnicity" className="flex items-center gap-2">
            Ethnicity
          </Label>
          <Select
            value={formData.ethnicity || ""}
            onValueChange={(value) => updateFormData({ ethnicity: value })}
          >
            <SelectTrigger id="ethnicity" className="h-11">
              <SelectValue placeholder="Select your ethnicity" />
            </SelectTrigger>
            <SelectContent>
              {ETHNICITY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* State */}
        <div className="space-y-2">
          <Label htmlFor="state" className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            State
          </Label>
          <Select
            value={formData.state || ""}
            onValueChange={(value) => updateFormData({ state: value })}
          >
            <SelectTrigger id="state" className="h-11">
              <SelectValue placeholder="Select your state" />
            </SelectTrigger>
            <SelectContent>
              {US_STATES.map((state) => (
                <SelectItem key={state.value} value={state.value}>
                  {state.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email" className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-muted-foreground" />
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="your@email.com"
            value={formData.email || ""}
            onChange={(e) => updateFormData({ email: e.target.value })}
            className="h-11"
          />
          <p className="text-xs text-muted-foreground">
            We will notify you when your matches are ready
          </p>
        </div>
      </div>
    </div>
  );
}

// Keep BasicInfoStep export for backward compatibility
export { DemographicsStep as BasicInfoStep };
