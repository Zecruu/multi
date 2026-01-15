import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;

let resendInstance: Resend | null = null;

export function getResend(): Resend {
  if (!resendInstance) {
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not defined");
    }
    resendInstance = new Resend(resendApiKey);
  }
  return resendInstance;
}

// Use Resend's default domain for testing until custom domain is verified
// To use your own domain, verify it at https://resend.com/domains
// Then set FROM_EMAIL=Multi Electric Supply <noreply@multielectricpr.com>
export const FROM_EMAIL = process.env.FROM_EMAIL || "Multi Electric Supply <onboarding@resend.dev>";

