import { Heart } from "lucide-react";
import { Header } from "@/components/Header";
import { OnboardingWizard } from "@/components/onboarding";

export default function PatientIntake() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/30 pt-20 pb-8 px-4">
      <Header />
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Heart className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Find Your Clinical Trials
          </h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Answer a few questions to discover clinical trials that may be right for you.
          </p>
        </div>

        {/* Onboarding Wizard */}
        <OnboardingWizard />

        {/* Privacy Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground mt-2">
            Your information is encrypted and handled in compliance with privacy regulations.
          </p>
        </div>
      </div>
    </div>
  );
}
