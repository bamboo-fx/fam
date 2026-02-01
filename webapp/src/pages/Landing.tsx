import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Shield,
  Activity,
  Sparkles,
  ClipboardList,
  Cpu,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { Header } from "@/components/Header";

export default function Landing() {
  const scrollToHowItWorks = () => {
    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <Header />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.015]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)",
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto animate-fade-in">
            <div>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                AI-Powered Clinical Trial Matching
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground mb-6">
              Smart matching for
              <br />
              <span className="text-primary">relevant clinical trials</span>
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              AI-powered matching connects patients with relevant clinical
              trials in seconds. Take the first step toward new treatment options.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/login">
                <Button size="lg" className="min-w-[180px] h-12 text-base">
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link to="/login?flow=test">
                <Button
                  variant="outline"
                  size="lg"
                  className="min-w-[180px] h-12 text-base"
                >
                  Test Full Flow
                </Button>
              </Link>
            </div>
          </div>

          {/* Trust indicators */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground animate-fade-in-delayed">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <span>Privacy First</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-border hidden sm:block" />
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <span>Live Trial Data</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-border hidden sm:block" />
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span>Free to Use</span>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 md:py-28 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              How It Works
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Three simple steps to find clinical trials tailored to your needs
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: ClipboardList,
                title: "Share Your Profile",
                description:
                  "Answer simple questions about your condition, treatment history, and location. Takes just a few minutes.",
              },
              {
                step: "02",
                icon: Cpu,
                title: "AI Matching",
                description:
                  "Our advanced AI analyzes thousands of active trials to find ones that match your specific profile.",
              },
              {
                step: "03",
                icon: CheckCircle2,
                title: "Get Matched",
                description:
                  "Receive personalized trial recommendations with detailed information to discuss with your doctor.",
              },
            ].map((item) => (
              <div key={item.step}>
                <Card className="relative h-full bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-colors">
                  <CardContent className="p-6 pt-8">
                    <div className="absolute -top-4 left-6 px-3 py-1 bg-primary text-primary-foreground text-sm font-semibold rounded-full">
                      Step {item.step}
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 mt-2">
                      <item.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      {item.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Why Choose MatchMyTrial
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Built with patients in mind, prioritizing your privacy and providing accurate,
              up-to-date information
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Shield,
                title: "Privacy First",
                description:
                  "Your data is never stored raw. We use advanced encryption and only keep what is necessary for matching.",
                color: "text-emerald-600",
                bg: "bg-emerald-50",
              },
              {
                icon: Activity,
                title: "Real-Time Data",
                description:
                  "Direct integration with ClinicalTrials.gov ensures you see the most current and accurate trial information.",
                color: "text-blue-600",
                bg: "bg-blue-50",
              },
              {
                icon: Sparkles,
                title: "AI-Powered",
                description:
                  "Smart matching algorithms analyze eligibility criteria to find trials most relevant to your situation.",
                color: "text-violet-600",
                bg: "bg-violet-50",
              },
            ].map((feature) => (
              <div key={feature.title}>
                <Card className="h-full bg-card hover:shadow-lg transition-shadow border-border/50">
                  <CardContent className="p-6">
                    <div
                      className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-4`}
                    >
                      <feature.icon className={`w-6 h-6 ${feature.color}`} />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed text-sm">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-28 bg-primary/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Ready to Find Your Match?
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
              Take the first step toward discovering clinical trials that may help on your
              treatment journey.
            </p>
            <Link to="/login">
              <Button size="lg" className="min-w-[200px] h-12 text-base">
                Start Matching Now
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <img
                src="/Generic-QUJA.png"
                alt="MatchMyTrial Logo"
                className="w-10 h-10 object-contain"
              />
              <span className="font-semibold">MatchMyTrial</span>
            </div>

            <div className="text-center md:text-right">
              <p className="text-sm text-muted-foreground mb-1">
                Your privacy is our priority. We never share your personal information.
              </p>
              <p className="text-xs text-muted-foreground/70">
                This is a prototype for informational purposes only, not medical advice. Always
                consult your healthcare provider.
              </p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-border/50 text-center">
            <p className="text-xs text-muted-foreground/60">
              © {new Date().getFullYear()} MatchMyTrial. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
