import { useState, useEffect, useRef } from "react";
import { Check, Sparkles, Zap, Database, Brain, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

// Types for SSE events
interface TrialData {
  nctId: string;
  title: string;
  status: string;
  index: number;
  total: number;
}

interface MatchData {
  nctId: string;
  title: string;
  score: number;
  reasoning: string;
  index: number;
  total: number;
}

type Phase = "firecrawl" | "matching" | "complete";

interface MatchingFlowProps {
  patientId: string;
  onComplete: (matchCount: number) => void;
  onError: (error: string) => void;
}

// Animated grid background
function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.3)_1px,transparent_1px)] bg-[size:64px_64px]" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-transparent to-transparent" />
    </div>
  );
}

// Glowing orb for visual effect
function GlowOrb({ color, className }: { color: string; className?: string }) {
  return (
    <div
      className={cn(
        "absolute rounded-full blur-3xl opacity-30",
        className
      )}
      style={{ background: color, animation: "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite" }}
    />
  );
}

// Trial card for firecrawl phase
function TrialCard({ trial, index }: { trial: TrialData; index: number }) {
  const statusColors: Record<string, string> = {
    RECRUITING: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    "NOT YET RECRUITING": "bg-amber-500/20 text-amber-400 border-amber-500/30",
    COMPLETED: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    ACTIVE: "bg-sky-500/20 text-sky-400 border-sky-500/30",
  };

  const statusClass =
    statusColors[trial.status.toUpperCase()] ||
    "bg-slate-500/20 text-slate-400 border-slate-500/30";

  return (
    <div
      className="relative group animate-slide-in-left"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative bg-card/80 backdrop-blur-sm border border-border/50 rounded-lg p-4 hover:border-primary/30 transition-all duration-300">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-primary/80">
                {trial.nctId}
              </span>
              <Badge
                variant="outline"
                className={cn("text-[10px] px-2 py-0 h-5 border", statusClass)}
              >
                {trial.status}
              </Badge>
            </div>
            <p className="text-sm text-foreground/90 line-clamp-2 leading-relaxed">
              {trial.title}
            </p>
          </div>
          <div
            className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center animate-scale-in"
            style={{ animationDelay: `${200 + index * 80}ms` }}
          >
            <Check className="w-4 h-4 text-primary" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Match card for AI matching phase
function MatchCard({
  match,
  index,
  isAnalyzing,
}: {
  match: MatchData | null;
  index: number;
  isAnalyzing: boolean;
}) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 60) return "text-amber-400";
    return "text-slate-400";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-emerald-500/20 border-emerald-500/30";
    if (score >= 60) return "bg-amber-500/20 border-amber-500/30";
    return "bg-slate-500/20 border-slate-500/30";
  };

  if (!match && isAnalyzing) {
    return (
      <div className="bg-card/50 backdrop-blur-sm border border-border/30 rounded-lg p-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="h-3 w-24 bg-muted rounded animate-pulse mb-2" />
            <div className="h-4 w-full bg-muted/50 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!match) return null;

  return (
    <div
      className="relative group animate-slide-in-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative bg-card/80 backdrop-blur-sm border border-border/50 rounded-lg p-4 hover:border-primary/30 transition-all">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex-shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center border",
              getScoreBg(match.score)
            )}
          >
            <span className={cn("text-lg font-bold", getScoreColor(match.score))}>
              {match.score}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              match
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-primary/80">
                {match.nctId}
              </span>
            </div>
            <p className="text-sm text-foreground/90 line-clamp-1 leading-relaxed mb-1">
              {match.title}
            </p>
            <p className="text-xs text-muted-foreground line-clamp-1">
              {match.reasoning}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Firecrawl screen component
function FirecrawlScreen({
  trials,
  progress,
  total,
}: {
  trials: TrialData[];
  progress: number;
  total: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [trials]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30 mx-auto animate-scale-in">
          <Zap className="w-8 h-8 text-orange-400" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-foreground tracking-tight">
            Scanning Clinical Trials Database
          </h2>
          <p className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
              </span>
              Powered by Firecrawl
            </span>
            <span className="text-border">|</span>
            <span>ClinicalTrials.gov</span>
          </p>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Scraping progress</span>
          <span className="font-mono text-foreground">
            {progress} / {total} trials
          </span>
        </div>
        <div className="relative">
          <Progress value={(progress / total) * 100} className="h-2" />
          <div className="absolute inset-0 h-2 rounded-full overflow-hidden animate-shimmer" />
        </div>
      </div>

      {/* Trials count */}
      <div className="flex items-center justify-center gap-4 py-3 px-4 bg-card/50 rounded-xl border border-border/50">
        <Database className="w-5 h-5 text-primary" />
        <div className="text-center">
          <div className="text-3xl font-bold text-foreground tabular-nums">
            {trials.length}
          </div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider">
            Trials Found
          </div>
        </div>
      </div>

      {/* Trial cards */}
      <div ref={scrollRef} className="space-y-3 max-h-[320px] overflow-y-auto pr-2 scrollbar-thin">
        {trials.map((trial, idx) => (
          <TrialCard key={trial.nctId} trial={trial} index={idx} />
        ))}
        {trials.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            <p className="text-sm">Initializing web scraper...</p>
          </div>
        )}
      </div>
    </div>
  );
}

// AI Matching screen component
function MatchingScreen({
  matches,
  currentIndex,
  total,
  analyzingTrial,
}: {
  matches: MatchData[];
  currentIndex: number;
  total: number;
  analyzingTrial: string | null;
}) {
  const highMatches = matches.filter((m) => m.score >= 70).length;
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [matches]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30 mx-auto animate-scale-in">
          <Brain className="w-8 h-8 text-violet-400" />
          <div className="absolute inset-0 rounded-2xl border-2 border-violet-400/50 animate-pulse-ring" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-foreground tracking-tight">
            AI Analysis in Progress
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Matching your profile against clinical trials
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Analyzing trials</span>
          <span className="font-mono text-foreground">
            {currentIndex} / {total}
          </span>
        </div>
        <Progress value={(currentIndex / total) * 100} className="h-2" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center justify-center gap-3 py-3 px-4 bg-card/50 rounded-xl border border-border/50">
          <Sparkles className="w-5 h-5 text-emerald-400" />
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-400 tabular-nums">
              {highMatches}
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">
              High Matches
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-3 py-3 px-4 bg-card/50 rounded-xl border border-border/50">
          <Brain className="w-5 h-5 text-violet-400" />
          <div className="text-center">
            <div className="text-2xl font-bold text-violet-400 tabular-nums">
              {matches.length}
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">
              Analyzed
            </div>
          </div>
        </div>
      </div>

      {/* Currently analyzing indicator */}
      {analyzingTrial && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-violet-500/10 rounded-lg px-3 py-2 border border-violet-500/20 animate-fade-in">
          <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
          <span>Analyzing:</span>
          <span className="font-mono text-violet-400">{analyzingTrial}</span>
        </div>
      )}

      {/* Match cards */}
      <div ref={scrollRef} className="space-y-3 max-h-[280px] overflow-y-auto pr-2 scrollbar-thin">
        {matches.map((match, idx) => (
          <MatchCard key={match.nctId} match={match} index={idx} isAnalyzing={false} />
        ))}
        {matches.length === 0 && analyzingTrial && (
          <MatchCard match={null} index={0} isAnalyzing={true} />
        )}
      </div>
    </div>
  );
}

// Complete screen component
function CompleteScreen({ matchCount }: { matchCount: number }) {
  return (
    <div className="text-center py-12 space-y-6 animate-fade-in">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-2 border-emerald-500/40 mx-auto animate-scale-in">
        <Check className="w-10 h-10 text-emerald-400 animate-check-mark" />
      </div>

      <div className="space-y-2">
        <h2
          className="text-2xl font-semibold text-foreground animate-slide-in-up"
          style={{ animationDelay: "200ms" }}
        >
          Analysis Complete
        </h2>
        <p
          className="text-muted-foreground animate-fade-in"
          style={{ animationDelay: "300ms" }}
        >
          Found{" "}
          <span className="text-emerald-400 font-semibold">{matchCount}</span>{" "}
          matching trials for your profile
        </p>
      </div>

      <div
        className="flex items-center justify-center gap-2 text-sm text-muted-foreground animate-fade-in"
        style={{ animationDelay: "400ms" }}
      >
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Preparing your results...</span>
      </div>
    </div>
  );
}

// Main MatchingFlow component
export function MatchingFlow({ patientId, onComplete, onError }: MatchingFlowProps) {
  const [phase, setPhase] = useState<Phase>("firecrawl");
  const [trials, setTrials] = useState<TrialData[]>([]);
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [firecrawlProgress, setFirecrawlProgress] = useState(0);
  const [firecrawlTotal, setFirecrawlTotal] = useState(10);
  const [matchingIndex, setMatchingIndex] = useState(0);
  const [matchingTotal, setMatchingTotal] = useState(0);
  const [analyzingTrial, setAnalyzingTrial] = useState<string | null>(null);
  const [matchCount, setMatchCount] = useState(0);

  useEffect(() => {
    const startMatching = async () => {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

      try {
        const response = await fetch(`${backendUrl}/api/matches/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ patientId }),
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to start matching");
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error("No response stream");
        }

        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          let currentEvent = "";
          for (const line of lines) {
            if (line.startsWith("event:")) {
              currentEvent = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
              try {
                const data = JSON.parse(line.slice(5).trim());
                handleSSEEvent(currentEvent, data);
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      } catch (error) {
        onError(error instanceof Error ? error.message : "Matching failed");
      }
    };

    const handleSSEEvent = (event: string, data: Record<string, unknown>) => {
      switch (event) {
        case "firecrawl_start":
          setPhase("firecrawl");
          break;

        case "firecrawl_found":
          setFirecrawlTotal((data.nctIdsFound as number) || 10);
          break;

        case "firecrawl_trial":
          setTrials((prev) => [
            ...prev,
            {
              nctId: data.nctId as string,
              title: data.title as string,
              status: data.status as string,
              index: data.index as number,
              total: data.total as number,
            },
          ]);
          setFirecrawlProgress(data.index as number);
          setFirecrawlTotal(data.total as number);
          break;

        case "firecrawl_complete":
          // Small delay before transitioning to matching
          setTimeout(() => setPhase("matching"), 500);
          break;

        case "matching_start":
          setPhase("matching");
          setMatchingTotal(data.totalTrials as number);
          break;

        case "matching_trial":
          setAnalyzingTrial(null);
          setMatches((prev) => [
            ...prev,
            {
              nctId: data.nctId as string,
              title: data.title as string,
              score: data.score as number,
              reasoning: data.reasoning as string,
              index: data.index as number,
              total: data.total as number,
            },
          ]);
          setMatchingIndex(data.index as number);
          // Set next trial as analyzing if not complete
          if ((data.index as number) < (data.total as number)) {
            setAnalyzingTrial(`NCT${(data.index as number) + 1}...`);
          }
          break;

        case "matching_complete":
          setMatchCount(data.matchCount as number);
          setPhase("complete");
          // Navigate after brief celebration
          setTimeout(() => {
            onComplete(data.matchCount as number);
          }, 2000);
          break;

        case "error":
          onError(data.error as string);
          break;

        // Handle legacy progress events
        case "progress":
          if ((data.step as number) === 1) {
            setPhase("firecrawl");
          } else if ((data.step as number) === 2) {
            setPhase("matching");
          }
          break;

        case "complete":
          setMatchCount(data.matchCount as number);
          setPhase("complete");
          setTimeout(() => {
            onComplete(data.matchCount as number);
          }, 2000);
          break;
      }
    };

    startMatching();
  }, [patientId, onComplete, onError]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Background effects */}
      <GridBackground />
      <GlowOrb
        color="hsl(var(--primary))"
        className="w-96 h-96 -top-48 -left-48"
      />
      <GlowOrb
        color="hsl(var(--accent))"
        className="w-96 h-96 -bottom-48 -right-48"
      />

      {/* Main content card */}
      <div className="relative w-full max-w-lg animate-slide-in-up">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-2xl blur-xl opacity-50" />
        <div className="relative bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden">
          {/* Top gradient line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />

          <div className="p-6 md:p-8">
            {phase === "firecrawl" && (
              <FirecrawlScreen
                trials={trials}
                progress={firecrawlProgress}
                total={firecrawlTotal}
              />
            )}
            {phase === "matching" && (
              <MatchingScreen
                matches={matches}
                currentIndex={matchingIndex}
                total={matchingTotal || trials.length}
                analyzingTrial={analyzingTrial}
              />
            )}
            {phase === "complete" && (
              <CompleteScreen matchCount={matchCount} />
            )}
          </div>

          {/* Bottom info */}
          <div className="px-6 pb-6 md:px-8 md:pb-8">
            <div className="pt-4 border-t border-border/50">
              <p className="text-xs text-muted-foreground text-center">
                {phase === "firecrawl" && "Retrieving the latest trial data from ClinicalTrials.gov"}
                {phase === "matching" && "AI analysis typically takes 20-40 seconds"}
                {phase === "complete" && "Redirecting to your personalized results"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
