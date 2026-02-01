import { useState } from "react";
import { Stethoscope, Check, Plus, X, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StepProps, CONDITION_CATEGORIES, ConditionCategory } from "./types";
import { cn } from "@/lib/utils";

export function SelectConditionsStep({ formData, updateFormData }: StepProps) {
  const [customCondition, setCustomCondition] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["Cancer"]) // Cancer expanded by default
  );

  const selectedConditions = formData.conditions || [];

  const toggleCondition = (condition: string) => {
    if (selectedConditions.includes(condition)) {
      updateFormData({
        conditions: selectedConditions.filter((c) => c !== condition),
      });
    } else {
      updateFormData({
        conditions: [...selectedConditions, condition],
      });
    }
  };

  const addCustomCondition = () => {
    const trimmed = customCondition.trim();
    if (trimmed && !selectedConditions.includes(trimmed)) {
      updateFormData({
        conditions: [...selectedConditions, trimmed],
      });
      setCustomCondition("");
    }
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  // Get all predefined conditions as a flat array
  const allPredefinedConditions: string[] = Object.values(CONDITION_CATEGORIES).flat();

  // Get custom conditions (ones not in predefined list)
  const customConditions = selectedConditions.filter(
    (c) => !allPredefinedConditions.includes(c)
  );

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <Stethoscope className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground">Select Your Conditions</h2>
        <p className="text-muted-foreground mt-2">
          Choose all conditions you would like to find clinical trials for
        </p>
      </div>

      {/* Selected conditions summary */}
      {selectedConditions.length > 0 && (
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-sm font-medium text-foreground mb-3">
            Selected conditions ({selectedConditions.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedConditions.map((condition) => (
              <Badge
                key={condition}
                variant="default"
                className="cursor-pointer py-1.5 px-3 bg-primary hover:bg-primary/90"
                onClick={() => toggleCondition(condition)}
              >
                <Check className="w-3 h-3 mr-1" />
                {condition}
                <X className="w-3 h-3 ml-1" />
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Condition categories */}
      <div className="space-y-3">
        {(Object.keys(CONDITION_CATEGORIES) as ConditionCategory[]).map(
          (category) => {
            const conditions = CONDITION_CATEGORIES[category];
            const isExpanded = expandedCategories.has(category);
            const selectedInCategory = conditions.filter((c) =>
              selectedConditions.includes(c)
            ).length;

            return (
              <div
                key={category}
                className="border border-border rounded-lg overflow-hidden"
              >
                <button
                  type="button"
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                  onClick={() => toggleCategory(category)}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-foreground">{category}</span>
                    {selectedInCategory > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {selectedInCategory} selected
                      </Badge>
                    )}
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>

                {isExpanded && (
                  <div className="p-4 pt-0 border-t border-border bg-muted/30">
                    <div className="flex flex-wrap gap-2 pt-4">
                      {conditions.map((condition) => {
                        const isSelected = selectedConditions.includes(condition);
                        return (
                          <Badge
                            key={condition}
                            variant={isSelected ? "default" : "outline"}
                            className={cn(
                              "cursor-pointer transition-all py-1.5 px-3",
                              isSelected
                                ? "bg-primary hover:bg-primary/90"
                                : "hover:bg-muted hover:border-primary/50"
                            )}
                            onClick={() => toggleCondition(condition)}
                          >
                            {isSelected ? (
                              <Check className="w-3 h-3 mr-1" />
                            ) : null}
                            {condition}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          }
        )}
      </div>

      {/* Custom conditions */}
      {customConditions.length > 0 && (
        <div className="p-4 rounded-lg border border-border">
          <p className="text-sm font-medium text-foreground mb-3">
            Custom conditions
          </p>
          <div className="flex flex-wrap gap-2">
            {customConditions.map((condition) => (
              <Badge
                key={condition}
                variant="default"
                className="cursor-pointer py-1.5 px-3 bg-secondary text-secondary-foreground hover:bg-secondary/80"
                onClick={() => toggleCondition(condition)}
              >
                {condition}
                <X className="w-3 h-3 ml-1" />
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Add custom condition */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">
          Add a custom condition
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="Enter a condition not listed above..."
            value={customCondition}
            onChange={(e) => setCustomCondition(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomCondition();
              }
            }}
            className="flex-1 h-11"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={addCustomCondition}
            disabled={!customCondition.trim()}
            className="h-11 w-11"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
