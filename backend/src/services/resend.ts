import { Resend } from "resend";

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// Sender email from verified domain
const SENDER_EMAIL = "noreply@matchmytrial.xyz";

/**
 * Result type for email operations
 */
export interface SendEmailResult {
  success: boolean;
  messageId?: string;
}

/**
 * Send a notification email when clinical trial matches are found.
 *
 * PRIVACY: This function intentionally does NOT include any medical details
 * or patient profile information. Only the match count and a link to view
 * results are included.
 *
 * @param email - Recipient email address
 * @param matchCount - Number of matches found
 * @param resultsUrl - URL where the patient can view their matches
 * @returns Result indicating success/failure and optional message ID
 */
export async function sendMatchNotification(
  email: string,
  matchCount: number,
  resultsUrl: string
): Promise<SendEmailResult> {
  try {
    const { data, error } = await resend.emails.send({
      from: SENDER_EMAIL,
      to: email,
      subject: "Your Clinical Trial Matches Are Ready",
      text: `We found ${matchCount} potential clinical trial matches based on your profile.

View your matches: ${resultsUrl}

This is an automated notification. No medical information is included in this email for your privacy.`,
    });

    if (error) {
      console.error("[Resend] Failed to send match notification:", error.message);
      return { success: false };
    }

    console.log(`[Resend] Match notification sent to ${email}, messageId: ${data?.id}`);
    return {
      success: true,
      messageId: data?.id,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("[Resend] Error sending match notification:", errorMessage);
    return { success: false };
  }
}
