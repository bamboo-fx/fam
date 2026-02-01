import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Search, Heart, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MatchCard, MatchCardSkeleton } from "@/components/MatchCard";
import { Header } from "@/components/Header";
import type { MatchResult, ClinicalTrial, PatientDocument } from "../../../backend/src/types";

const baseUrl = import.meta.env.VITE_BACKEND_URL;

interface MatchWithTrial extends MatchResult {
  trial: ClinicalTrial;
}

interface MatchesResponse {
  matches: MatchWithTrial[];
  patient?: PatientDocument;
}

async function fetchMatches(patientId: string): Promise<MatchesResponse> {
  const response = await fetch(`${baseUrl}/api/matches/${patientId}`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Failed to fetch matches");
  }
  const json = (await response.json()) as { data: MatchesResponse };
  return json.data;
}

function ResultsHeader({ matchCount }: { matchCount: number }) {
  return (
    <header className="text-center mb-8 md:mb-12">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
        <Heart className="h-8 w-8 text-primary" />
      </div>
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
        Your Clinical Trial Matches
      </h1>
      <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-2">
        {matchCount > 0
          ? `We found ${matchCount} clinical trial${matchCount !== 1 ? "s" : ""} that may be a good fit for you.`
          : "Searching for clinical trials that match your profile..."}
      </p>
      {matchCount > 0 ? (
        <p className="text-sm text-muted-foreground max-w-xl mx-auto">
          These matches are based on your profile information and each trial's
          eligibility criteria. Trials are sorted by how well they match your
          profile.
        </p>
      ) : null}
    </header>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12 px-4">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-6">
        <Search className="h-10 w-10 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold mb-3">No Matches Found</h2>
      <p className="text-muted-foreground max-w-md mx-auto mb-6">
        We could not find any clinical trials that match your current profile.
        This does not mean there are no options for you.
      </p>
      <div className="bg-muted/50 rounded-lg p-6 max-w-lg mx-auto text-left">
        <h3 className="font-medium mb-3">What you can do:</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">1.</span>
            <span>
              Try broadening your search criteria or updating your profile
              information
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">2.</span>
            <span>
              Check back later as new clinical trials are added regularly
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">3.</span>
            <span>
              Contact our support team for personalized assistance finding
              trials
            </span>
          </li>
        </ul>
      </div>
      <div className="mt-8">
        <Button asChild variant="outline">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Return Home
          </Link>
        </Button>
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="text-center py-12 px-4">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-destructive/10 mb-6">
        <AlertCircle className="h-10 w-10 text-destructive" />
      </div>
      <h2 className="text-xl font-semibold mb-3">Something Went Wrong</h2>
      <p className="text-muted-foreground max-w-md mx-auto mb-6">{message}</p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button onClick={() => window.location.reload()}>Try Again</Button>
        <Button asChild variant="outline">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Return Home
          </Link>
        </Button>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <>
      <ResultsHeader matchCount={0} />
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <MatchCardSkeleton key={i} />
        ))}
      </div>
    </>
  );
}

function MatchesList({ matches, patient }: { matches: MatchWithTrial[]; patient?: PatientDocument }) {
  // Sort by confidence score (highest first)
  const sortedMatches = [...matches].sort(
    (a, b) => b.confidenceScore - a.confidenceScore
  );

  // Get patient conditions - combine conditions and aiParsedConditions
  const patientConditions = patient
    ? [...(patient.conditions ?? []), ...(patient.aiParsedConditions ?? [])]
    : [];
  const patientEmail = patient?.email;

  return (
    <>
      <ResultsHeader matchCount={matches.length} />

      {matches.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="space-y-6">
            {sortedMatches.map((match) => (
              <MatchCard
                key={match.id}
                trialTitle={match.trial.title}
                nctId={match.trialId}
                confidenceScore={match.confidenceScore}
                reasoning={match.reasoning}
                status={match.trial.status}
                trialUrl={match.trial.url}
                trialContactEmail={match.trial.contactEmail}
                trialContactName={match.trial.contactName}
                patientConditions={patientConditions}
                patientEmail={patientEmail}
              />
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Always consult with your healthcare provider before enrolling in
              any clinical trial.
            </p>
            <Button asChild variant="outline">
              <Link to="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Start New Search
              </Link>
            </Button>
          </div>
        </>
      )}
    </>
  );
}

export default function Results() {
  const { patientId } = useParams<{ patientId: string }>();

  const {
    data: matches,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["matches", patientId],
    queryFn: () => fetchMatches(patientId!),
    enabled: !!patientId,
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Ambient background effects */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-accent/5 blur-3xl" />
      </div>

      {/* Subtle grid pattern */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <main className="relative z-10 container max-w-3xl mx-auto px-4 pt-24 pb-8 md:pt-28 md:pb-12">
        {/* Back button */}
        <div className="mb-6">
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState
            message={
              error instanceof Error
                ? error.message
                : "We encountered an error while fetching your matches. Please try again."
            }
          />
        ) : (
          <MatchesList
            matches={matches?.matches ?? []}
            patient={matches?.patient}
          />
        )}
      </main>
    </div>
  );
}
