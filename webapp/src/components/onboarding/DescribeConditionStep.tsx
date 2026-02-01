import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { FileText, Sparkles, Loader2, Plus, X, Check } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { StepProps } from "./types";
import { toast } from "sonner";

interface ParsedCondition {
  condition: string;
  confidence?: number;
}

interface ParseConditionsResponse {
  conditions: ParsedCondition[];
}

export function DescribeConditionStep({ formData, updateFormData }: StepProps) {
  const [parsedConditions, setParsedConditions] = useState<ParsedCondition[]>([]);
  const selectedConditions = formData.conditions || [];

  const parseConditionsMutation = useMutation({
    mutationFn: async (description: string) => {
      return api.post<{ conditions: string[] }>("/api/patients/parse-conditions", {
        description,
      });
    },
    onSuccess: (data) => {
      if (data.conditions && data.conditions.length > 0) {
        // Convert strings to ParsedCondition format
        setParsedConditions(data.conditions.map(c => ({ condition: c })));
        toast.success(`Found ${data.conditions.length} condition(s) in your description`);
      } else {
        toast.info("No specific conditions found. Try adding more medical details.");
      }
    },
    onError: () => {
      toast.error("Failed to parse conditions. Please try again.");
    },
  });

  const addParsedCondition = (condition: string) => {
    if (!selectedConditions.includes(condition)) {
      updateFormData({
        conditions: [...selectedConditions, condition],
      });
    }
    setParsedConditions(parsedConditions.filter((c) => c.condition !== condition));
  };

  const dismissParsedCondition = (condition: string) => {
    setParsedConditions(parsedConditions.filter((c) => c.condition !== condition));
  };

  const addAllParsedConditions = () => {
    const newConditions = parsedConditions
      .map((c) => c.condition)
      .filter((c) => !selectedConditions.includes(c));

    if (newConditions.length > 0) {
      updateFormData({
        conditions: [...selectedConditions, ...newConditions],
      });
    }
    setParsedConditions([]);
  };

  const canParse = (formData.conditionDescription?.trim().length || 0) > 20;

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <FileText className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground">Describe Your Condition</h2>
        <p className="text-muted-foreground mt-2">
          Provide additional details to help us find the best matches
        </p>
      </div>

      {/* Current selected conditions */}
      {selectedConditions.length > 0 && (
        <div className="p-4 rounded-lg bg-muted/50 border border-border">
          <p className="text-sm font-medium text-foreground mb-3">
            Your selected conditions ({selectedConditions.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedConditions.map((condition) => (
              <Badge
                key={condition}
                variant="secondary"
                className="py-1.5 px-3"
              >
                <Check className="w-3 h-3 mr-1" />
                {condition}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Description textarea */}
      <div className="space-y-3">
        <Textarea
          placeholder="Describe your diagnosis, treatments you've tried, biomarkers, or any other medical details that might help us find relevant trials.

For example:
- Stage and type of cancer (e.g., Stage IIIB NSCLC)
- Biomarkers (e.g., EGFR positive, PD-L1 expression 50%)
- Previous treatments (e.g., chemotherapy, immunotherapy)
- Current medications
- Any relevant test results"
          value={formData.conditionDescription || ""}
          onChange={(e) => updateFormData({ conditionDescription: e.target.value })}
          className="min-h-[200px] resize-none"
        />
        <p className="text-xs text-muted-foreground">
          The more detail you provide, the better we can match you with relevant trials.
        </p>
      </div>

      {/* Parse with AI button */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => parseConditionsMutation.mutate(formData.conditionDescription || "")}
          disabled={!canParse || parseConditionsMutation.isPending}
          className="flex-1"
        >
          {parseConditionsMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Parse with AI
            </>
          )}
        </Button>
        {!canParse && (
          <p className="text-xs text-muted-foreground self-center">
            Enter at least 20 characters to use AI parsing
          </p>
        )}
      </div>

      {/* Parsed conditions */}
      {parsedConditions.length > 0 && (
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              AI found these conditions in your description
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addAllParsedConditions}
              className="text-primary hover:text-primary"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add all
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {parsedConditions.map((parsed) => (
              <div
                key={parsed.condition}
                className="inline-flex items-center gap-1 py-1.5 px-3 rounded-full bg-background border border-primary/30 text-sm"
              >
                <span>{parsed.condition}</span>
                <button
                  type="button"
                  onClick={() => addParsedCondition(parsed.condition)}
                  className="ml-1 p-0.5 rounded-full hover:bg-primary/10 text-primary"
                  title="Add condition"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => dismissParsedCondition(parsed.condition)}
                  className="p-0.5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  title="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
