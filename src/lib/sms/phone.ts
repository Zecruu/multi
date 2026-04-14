/** Strip everything but digits; drop leading US country code. */
export function normalizeDigits(raw: string): string {
  const d = (raw || "").replace(/\D/g, "");
  if (d.startsWith("1") && d.length === 11) return d.substring(1);
  return d;
}

/** Convert any user-entered phone to E.164 (+1XXXXXXXXXX) for US/PR. */
export function toE164(raw: string): string {
  const d = normalizeDigits(raw);
  if (!d) throw new Error("empty phone");
  if (d.length < 10) throw new Error(`phone too short: ${raw}`);
  return `+1${d.slice(-10)}`;
}

/**
 * Build a regex that matches a phone number regardless of formatting
 * — "7875551234", "+17875551234", "(787) 555-1234" all match.
 */
export function loosePhoneRegex(raw: string): RegExp {
  const d = normalizeDigits(raw);
  return new RegExp(d.split("").join("\\D*"));
}

export function truncateSms(text: string, limit = 160): string {
  if (text.length <= limit) return text;
  const cut = text.substring(0, limit - 3);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > limit * 0.6 ? cut.substring(0, lastSpace) : cut) + "...";
}
