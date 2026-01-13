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

export const FROM_EMAIL = process.env.FROM_EMAIL || "Multi Electric Supply <noreply@multielectricpr.com>";

