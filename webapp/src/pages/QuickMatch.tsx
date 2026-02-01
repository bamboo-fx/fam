import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Upload,
  FileText,
  X,
  Shield,
  Image,
  File,
  ArrowRight,
  Loader2,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/Header";
import { MatchingFlow } from "@/components/onboarding/MatchingFlow";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

interface PatientResponse {
  patientId: string;
}

export default function QuickMatch() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [patientId, setPatientId] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/gif",
      ];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Please upload a PDF or image file (JPEG, PNG, GIF)");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      setUploadedFile(file);
      toast.success("Document uploaded");
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
  };

  const getFileIcon = (file: File) => {
    if (file.type === "application/pdf") {
      return <FileText className="w-8 h-8 text-red-500" />;
    }
    if (file.type.startsWith("image/")) {
      return <Image className="w-8 h-8 text-blue-500" />;
    }
    return <File className="w-8 h-8 text-muted-foreground" />;
  };

  const isFormValid = email.includes("@") && uploadedFile;

  const handleSubmit = async () => {
    if (!email || !uploadedFile) {
      toast.error("Please provide email and upload a document");
      return;
    }

    try {
      setIsSubmitting(true);

      // Create patient with quick-match endpoint (just email + document)
      const formPayload = new FormData();
      formPayload.append("email", email);
      formPayload.append("document", uploadedFile);

      const response = await api.raw("/api/patients/quick-match", {
        method: "POST",
        body: formPayload,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error?.message || "Failed to process document");
      }

      const json = await response.json();
      const patient = json.data as PatientResponse;

      setPatientId(patient.patientId);
      setIsMatching(true);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong"
      );
      setIsSubmitting(false);
    }
  };

  const handleMatchingComplete = (matchCount: number) => {
    toast.success(`Found ${matchCount} matching trials!`);
    if (patientId) {
      navigate(`/results/${patientId}`);
    }
  };

  const handleMatchingError = (error: string) => {
    setIsMatching(false);
    setPatientId(null);
    setIsSubmitting(false);
    toast.error(error);
  };

  // Show matching flow
  if (isMatching && patientId) {
    return (
      <MatchingFlow
        patientId={patientId}
        onComplete={handleMatchingComplete}
        onError={handleMatchingError}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Background effects */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-accent/5 blur-3xl" />
      </div>

      <main className="relative z-10 container max-w-2xl mx-auto px-4 pt-24 pb-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
            <Upload className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Quick Match
          </h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Upload your medical document and we'll find matching clinical trials instantly
          </p>
        </div>

        <Card className="shadow-xl border-border/50">
          <CardContent className="p-6 md:p-8 space-y-6">
            {/* Email input */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12"
              />
              <p className="text-xs text-muted-foreground">
                We'll send your results to this email
              </p>
            </div>

            {/* File upload */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                Medical Document
              </Label>

              {uploadedFile ? (
                <div className="p-4 rounded-lg border-2 border-primary/30 bg-primary/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getFileIcon(uploadedFile)}
                      <div>
                        <p className="font-medium text-foreground text-sm">
                          {uploadedFile.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={removeFile}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <label
                  className={cn(
                    "flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer transition-all",
                    "border-border hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  <div className="flex flex-col items-center justify-center py-4">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                      <Upload className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-foreground mb-1">
                      <span className="font-medium text-primary">Click to upload</span>{" "}
                      or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PDF, JPEG, PNG (max 10MB)
                    </p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.gif"
                    onChange={handleFileChange}
                  />
                </label>
              )}
            </div>

            {/* What to upload */}
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <p className="font-medium text-foreground text-sm mb-2">
                Accepted documents
              </p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Pathology reports</li>
                <li>• Lab test results (biomarkers, blood work)</li>
                <li>• Imaging reports (CT, MRI, PET scans)</li>
                <li>• Treatment summaries or discharge summaries</li>
              </ul>
            </div>

            {/* Privacy notice */}
            <div className="flex items-start gap-3 p-4 rounded-lg bg-secondary/50 border border-border">
              <Shield className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground text-sm">
                  Privacy Protected
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your document is processed securely using AI to extract only
                  relevant medical information. No personal data is stored.
                </p>
              </div>
            </div>

            {/* Submit button */}
            <Button
              onClick={handleSubmit}
              disabled={!isFormValid || isSubmitting}
              className="w-full h-12 text-base"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing Document...
                </>
              ) : (
                <>
                  Find My Matches
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Footer note */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          This is a prototype for informational purposes only, not medical advice.
        </p>
      </main>
    </div>
  );
}
