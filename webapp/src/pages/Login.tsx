import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Heart, Mail } from "lucide-react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const flow = searchParams.get("flow");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
      });

      if (result.error) {
        setError(result.error.message || "Failed to send verification code");
        return;
      }

      toast.success("Verification code sent to your email");
      // Pass the flow parameter to verify-otp so it knows where to redirect
      navigate("/verify-otp", { state: { email, flow } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const isValidEmail = email.includes("@") && email.includes(".");

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/30 flex items-center justify-center px-4 py-8">
      {/* Ambient background effects */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/4 top-1/4 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <Card className="relative z-10 w-full max-w-md shadow-lg border-border/50">
        <CardHeader className="text-center space-y-4 pb-6">
          {/* Logo/Icon */}
          <div className="mx-auto inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
            <Heart className="w-8 h-8 text-primary" />
          </div>

          <div className="space-y-2">
            <CardTitle className="text-2xl md:text-3xl font-bold">
              Sign in to MatchMyTrial
            </CardTitle>
            <CardDescription className="text-base">
              Find clinical trials tailored to your needs
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11"
                  disabled={isLoading}
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            {error ? (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            ) : null}

            <Button
              type="submit"
              size="lg"
              className="w-full h-11 text-base font-semibold"
              disabled={isLoading || !isValidEmail}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Sending code...
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </form>

          {/* Privacy notice */}
          <p className="mt-6 text-center text-xs text-muted-foreground">
            We will send you a one-time verification code.
            <br />
            Your email is protected and never shared.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
