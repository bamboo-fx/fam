import { ExternalLink, Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { EmailComposeDialog } from "@/components/EmailComposeDialog";

export interface MatchCardProps {
  trialTitle: string;
  nctId: string;
  confidenceScore: number;
  reasoning: string;
  status: string;
  trialUrl: string;
  trialContactEmail?: string;
  trialContactName?: string;
  patientConditions?: string[];
  patientEmail?: string;
}

function getConfidenceColor(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-orange-600";
}

function getConfidenceLabel(score: number): string {
  if (score >= 80) return "Strong Match";
  if (score >= 60) return "Good Match";
  return "Potential Match";
}

function getStatusVariant(
  status: string
): "default" | "secondary" | "outline" | "destructive" {
  const lowerStatus = status.toLowerCase();
  if (lowerStatus.includes("recruiting")) return "default";
  if (lowerStatus.includes("active")) return "secondary";
  if (lowerStatus.includes("completed")) return "outline";
  return "secondary";
}

export function MatchCard({
  trialTitle,
  nctId,
  confidenceScore,
  reasoning,
  status,
  trialUrl,
  trialContactEmail,
  trialContactName,
  patientConditions = [],
  patientEmail,
}: MatchCardProps) {
  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/30">
      {/* Subtle gradient accent on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <CardHeader className="relative pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg md:text-xl leading-tight line-clamp-2">
              {trialTitle}
            </CardTitle>
            <CardDescription className="mt-2">
              <a
                href={`https://clinicaltrials.gov/study/${nctId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                {nctId}
                <ExternalLink className="h-3 w-3" />
              </a>
            </CardDescription>
          </div>
          <Badge variant={getStatusVariant(status)} className="shrink-0">
            {status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="relative space-y-4">
        {/* Confidence Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles
                className={cn("h-4 w-4", getConfidenceColor(confidenceScore))}
              />
              <span
                className={cn(
                  "text-sm font-medium",
                  getConfidenceColor(confidenceScore)
                )}
              >
                {getConfidenceLabel(confidenceScore)}
              </span>
            </div>
            <span className="text-sm font-semibold tabular-nums">
              {confidenceScore}%
            </span>
          </div>
          <Progress value={confidenceScore} className="h-2" />
        </div>

        {/* AI Reasoning */}
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {reasoning}
          </p>
        </div>
      </CardContent>

      <CardFooter className="relative pt-2">
        <div className="flex flex-col sm:flex-row gap-2 w-full">
          <Button asChild className="w-full md:w-auto">
            <a href={trialUrl} target="_blank" rel="noopener noreferrer">
              View Full Details
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
          <EmailComposeDialog
            nctId={nctId}
            trialTitle={trialTitle}
            reasoning={reasoning}
            trialContactEmail={trialContactEmail}
            trialContactName={trialContactName}
            patientConditions={patientConditions}
            patientEmail={patientEmail}
          />
        </div>
      </CardFooter>
    </Card>
  );
}

export function MatchCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="h-6 w-3/4 bg-muted animate-pulse rounded" />
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
          </div>
          <div className="h-6 w-20 bg-muted animate-pulse rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            <div className="h-4 w-10 bg-muted animate-pulse rounded" />
          </div>
          <div className="h-2 w-full bg-muted animate-pulse rounded-full" />
        </div>
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="space-y-2">
            <div className="h-4 w-full bg-muted animate-pulse rounded" />
            <div className="h-4 w-5/6 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-2">
        <div className="h-10 w-36 bg-muted animate-pulse rounded-md" />
      </CardFooter>
    </Card>
  );
}
