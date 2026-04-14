import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongodb";
import ReviewRequest from "@/models/ReviewRequest";
import SmsOptOut from "@/models/SmsOptOut";
import { normalizeDigits, toE164 } from "@/lib/sms/phone";
import { sendSms } from "@/lib/sms/provider";
import { tplReviewPromptEs } from "@/lib/sms/templates";

async function getAdmin() {
  const c = (await cookies()).get("admin_session");
  if (!c) return null;
  try {
    const data = JSON.parse(Buffer.from(c.value, "base64").toString());
    if (data.role !== "admin" && data.role !== "gerente" && data.role !== "employee") return null;
    return { name: data.name || data.username || "admin", role: data.role };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const admin = await getAdmin();
  if (!admin) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const firstName = String(body.firstName || "").trim();
  const phoneRaw = String(body.phone || "").trim();
  const consentChecked = !!body.consent;

  if (!firstName) {
    return NextResponse.json({ error: "firstName required" }, { status: 400 });
  }
  if (!phoneRaw) {
    return NextResponse.json({ error: "phone required" }, { status: 400 });
  }
  if (!consentChecked) {
    return NextResponse.json(
      { error: "consent confirmation required (customer must have agreed in-store)" },
      { status: 400 }
    );
  }

  let e164: string;
  let digits: string;
  try {
    e164 = toE164(phoneRaw);
    digits = normalizeDigits(phoneRaw);
    if (digits.length !== 10) {
      return NextResponse.json({ error: "phone must be 10 digits" }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "invalid phone" },
      { status: 400 }
    );
  }

  await connectDB();

  // Respect global opt-out.
  const optedOut = await SmsOptOut.findOne({ phoneDigits: digits });
  if (optedOut) {
    return NextResponse.json(
      {
        error:
          "this number has opted out of SMS. they must re-subscribe before you can contact them again.",
      },
      { status: 409 }
    );
  }

  // Duplicate prevention: no more than one request per phone per 30 days.
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  const recent = await ReviewRequest.findOne({
    phoneDigits: digits,
    sentAt: { $gte: new Date(Date.now() - THIRTY_DAYS_MS) },
  });
  if (recent) {
    return NextResponse.json(
      {
        error: `a review request was already sent to this number on ${recent.sentAt.toISOString().slice(0, 10)} (status: ${recent.status}). wait 30 days or confirm with the customer.`,
      },
      { status: 409 }
    );
  }

  const message = tplReviewPromptEs(firstName);
  const sendResult = await sendSms(e164, message);

  const doc = await ReviewRequest.create({
    firstName,
    phone: e164,
    phoneDigits: digits,
    language: "es",
    status: "sent",
    conversation: [{ role: "bot", content: sendResult.message, timestamp: new Date() }],
    sentBy: admin.name,
    provider: sendResult.provider,
    sentAt: new Date(),
  });

  return NextResponse.json({
    ok: true,
    id: String(doc._id),
    provider: sendResult.provider,
    preview: sendResult.provider === "preview",
    message: sendResult.message,
  });
}
