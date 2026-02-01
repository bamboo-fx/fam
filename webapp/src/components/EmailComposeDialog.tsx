import { useState, useEffect } from "react";
import { Mail, Send, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface EmailComposeDialogProps {
  nctId: string;
  trialTitle: string;
  reasoning: string;
  trialContactEmail?: string;
  trialContactName?: string;
  patientConditions: string[];
  patientEmail?: string;
}

/**
 * Convert third-person reasoning text to first-person perspective
 * Transforms phrases like "Patient's condition" to "My condition"
 */
function convertToFirstPerson(text: string): string {
  return text
    // Replace "Patient's" with "My" (case variations)
    .replace(/\bPatient's\b/gi, "My")
    .replace(/\bpatient's\b/gi, "my")
    // Replace "The patient" with "I"
    .replace(/\bThe patient\b/gi, "I")
    .replace(/\bthe patient\b/gi, "I")
    // Replace "This patient" with "I"
    .replace(/\bThis patient\b/gi, "I")
    .replace(/\bthis patient\b/gi, "I")
    // Replace "Patient is" with "I am"
    .replace(/\bPatient is\b/gi, "I am")
    .replace(/\bpatient is\b/gi, "I am")
    // Replace "Patient has" with "I have"
    .replace(/\bPatient has\b/gi, "I have")
    .replace(/\bpatient has\b/gi, "I have")
    // Replace "Patient may" with "I may"
    .replace(/\bPatient may\b/gi, "I may")
    .replace(/\bpatient may\b/gi, "I may")
    // Replace "Patient does" with "I do"
    .replace(/\bPatient does\b/gi, "I do")
    .replace(/\bpatient does\b/gi, "I do")
    // Replace "Patient's age" → "My age" already covered, but also handle standalone "Patient"
    .replace(/\bPatient\b(?!')/g, "I")
    // Replace "they may qualify" with "I may qualify"
    .replace(/\bthey may qualify\b/gi, "I may qualify")
    .replace(/\bThey may qualify\b/gi, "I may qualify")
    // Replace "they have" with "I have"
    .replace(/\bthey have\b/gi, "I have")
    .replace(/\bThey have\b/gi, "I have")
    // Replace "they are" with "I am"
    .replace(/\bthey are\b/gi, "I am")
    .replace(/\bThey are\b/gi, "I am")
    // Replace "their" with "my"
    .replace(/\btheir\b/gi, "my")
    .replace(/\bTheir\b/gi, "My");
}

function generateEmailBody(
  nctId: string,
  trialTitle: string,
  reasoning: string,
  patientConditions: string[],
  patientEmail?: string,
  contactName?: string
): string {
  const conditionsText =
    patientConditions.length > 0
      ? patientConditions.join(", ")
      : "my medical condition";

  // Convert reasoning from third-person to first-person
  const firstPersonReasoning = convertToFirstPerson(reasoning);

  // Generate salutation using contact name if available
  const salutation = contactName
    ? `Dear Dr. ${contactName},`
    : "Dear Clinical Trial Coordinator,";

  return `${salutation}

I am writing to inquire about potential participation in your clinical trial:

Trial: ${trialTitle}
NCT ID: ${nctId}

I have been diagnosed with ${conditionsText}. Based on my review of the trial eligibility criteria, I believe I may be a suitable candidate for this study.

My understanding of why I may qualify:
${firstPersonReasoning}

I am very interested in learning more about this trial and would appreciate the opportunity to discuss my eligibility with your team. Could you please provide information about the next steps in the enrollment process?

${patientEmail ? `You can reach me at: ${patientEmail}` : "Please let me know the best way to proceed."}

Thank you for your time and consideration. I look forward to hearing from you.

Best regards`;
}

export function EmailComposeDialog({
  nctId,
  trialTitle,
  reasoning,
  trialContactEmail,
  trialContactName,
  patientConditions,
  patientEmail,
}: EmailComposeDialogProps) {
  const [open, setOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const hasContactEmail = !!trialContactEmail;

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      // Autofill recipient email from scraped trial data
      setRecipientEmail(trialContactEmail || "");
      setSubject(`Clinical Trial Participation Inquiry - ${nctId}`);
      setBody(
        generateEmailBody(
          nctId,
          trialTitle,
          reasoning,
          patientConditions,
          patientEmail,
          trialContactName
        )
      );
    }
  }, [open, nctId, trialTitle, reasoning, trialContactEmail, trialContactName, patientConditions, patientEmail]);

  const handleSendEmail = () => {
    const mailtoUrl = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl, "_blank");
    setOpen(false);
  };

  // If no contact email available, show disabled button with tooltip
  if (!hasContactEmail) {
    return (
      <Button
        variant="outline"
        className="w-full md:w-auto opacity-50 cursor-not-allowed"
        disabled
        title="No contact email available for this trial"
      >
        <AlertCircle className="mr-2 h-4 w-4" />
        No Contact Email
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full md:w-auto">
          <Mail className="mr-2 h-4 w-4" />
          Send Email
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compose Email to Trial Coordinator</DialogTitle>
          <DialogDescription>
            Review and edit the email below, then click send to open in your email client.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="recipient">Recipient Email</Label>
            <Input
              id="recipient"
              type="email"
              placeholder="Enter trial coordinator's email address"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Message</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-[250px] font-mono text-sm"
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button onClick={handleSendEmail} className="w-full sm:w-auto">
            <Send className="mr-2 h-4 w-4" />
            Open in Email Client
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
