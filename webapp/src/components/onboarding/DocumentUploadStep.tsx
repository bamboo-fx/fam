import { Upload, FileText, X, Shield, Image, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepWithFileProps } from "./types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function DocumentUploadStep({
  uploadedFile,
  setUploadedFile,
}: StepWithFileProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
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
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      setUploadedFile(file);
      toast.success("File uploaded successfully");
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

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <Upload className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground">Upload Documents</h2>
        <p className="text-muted-foreground mt-2">
          Optionally upload medical records to improve your matches
        </p>
      </div>

      {/* File upload area */}
      {uploadedFile ? (
        <div className="p-6 rounded-lg border-2 border-primary/30 bg-primary/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {getFileIcon(uploadedFile)}
              <div>
                <p className="font-medium text-foreground">{uploadedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={removeFile}
              className="h-10 w-10 text-muted-foreground hover:text-destructive"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
      ) : (
        <label
          className={cn(
            "flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-all",
            "border-border hover:border-primary/50 hover:bg-muted/50"
          )}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
              <Upload className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-base text-foreground mb-1">
              <span className="font-medium text-primary">Click to upload</span> or drag
              and drop
            </p>
            <p className="text-sm text-muted-foreground">
              PDF, JPEG, PNG, or GIF (max 10MB)
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

      {/* What to upload */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="p-4 rounded-lg bg-muted/50 border border-border">
          <p className="font-medium text-foreground mb-2">Helpful documents</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>- Pathology reports</li>
            <li>- Lab test results</li>
            <li>- Imaging reports (CT, MRI, PET)</li>
            <li>- Treatment summaries</li>
          </ul>
        </div>
        <div className="p-4 rounded-lg bg-muted/50 border border-border">
          <p className="font-medium text-foreground mb-2">Why upload?</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>- More accurate trial matching</li>
            <li>- Discover eligibility criteria</li>
            <li>- Save time on data entry</li>
            <li>- Find trials you might miss</li>
          </ul>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-secondary/50 border border-border">
        <Shield className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium text-foreground text-sm">Your privacy is protected</p>
          <p className="text-sm text-muted-foreground mt-1">
            Your document is processed securely and never permanently stored. We use it
            only to extract relevant medical information to improve your trial matches.
            All data is encrypted and handled in compliance with privacy regulations.
          </p>
        </div>
      </div>

      {/* Skip note */}
      <p className="text-center text-sm text-muted-foreground">
        This step is optional. You can skip it and still get personalized matches.
      </p>
    </div>
  );
}
