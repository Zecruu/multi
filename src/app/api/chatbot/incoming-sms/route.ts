import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ReviewRequest from "@/models/ReviewRequest";
import SmsOptOut from "@/models/SmsOptOut";
import { normalizeDigits } from "@/lib/sms/phone";
import { sendSms } from "@/lib/sms/provider";
import { isHelp, isStop, parseRating } from "@/lib/sms/rating-parser";
import {
  tplAmbiguousEs,
  tplHelpEs,
  tplNegativeFollowupEs,
  tplPositiveFollowupEs,
  tplStopConfirmationEs,
} from "@/lib/sms/templates";

// AWS SNS calls this webhook. We always 200 so SNS doesn't retry.
export const dynamic = "force-dynamic";

type HandlerResult = { handled: boolean; reply?: string };

// ──────────────────────────────────────────────────────────────────────────────
// Review reply handler — find the active ReviewRequest for this phone and
// advance its state based on the customer's message.
// ──────────────────────────────────────────────────────────────────────────────
async function handleReviewReply(
  phoneDigits: string,
  text: string
): Promise<HandlerResult> {
  const active = await ReviewRequest.findOne({
    phoneDigits,
    status: "sent",
  }).sort({ sentAt: -1 });
  if (!active) return { handled: false };

  active.conversation.push({
    role: "customer",
    content: text,
    timestamp: new Date(),
  });

  if (isStop(text)) {
    active.status = "opted_out";
    active.respondedAt = new Date();
    await SmsOptOut.updateOne(
      { phoneDigits },
      { $set: { phoneDigits, reason: "customer_stop" } },
      { upsert: true }
    );
    await active.save();
    return { handled: true, reply: tplStopConfirmationEs() };
  }

  if (isHelp(text)) {
    // HELP doesn't close the conversation.
    await active.save();
    return { handled: true, reply: tplHelpEs() };
  }

  const parsed = await parseRating(text);
  active.sentimentSource = parsed.source === "none" ? undefined : parsed.source;
  active.respondedAt = new Date();

  if (parsed.rating === null) {
    // Leave in "sent" so next reply can still rate them, but respond.
    await active.save();
    return { handled: true, reply: tplAmbiguousEs() };
  }

  active.rating = parsed.rating;
  if (parsed.rating >= 4) {
    active.status = "rated_positive";
    await active.save();
    return { handled: true, reply: tplPositiveFollowupEs() };
  } else {
    active.status = "rated_negative";
    active.feedbackText = text.slice(0, 500);
    await active.save();
    return { handled: true, reply: tplNegativeFollowupEs() };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// POST handler
// ──────────────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const messageType = request.headers.get("x-amz-sns-message-type") || "";
  const rawBody = await request.text();

  // 1. SNS subscription confirmation — auto-subscribe.
  if (messageType === "SubscriptionConfirmation") {
    try {
      const snsMessage = JSON.parse(rawBody);
      if (snsMessage.SubscribeURL) {
        await fetch(snsMessage.SubscribeURL);
      }
    } catch {
      // ignore — SNS will retry if our 200 doesn't come back
    }
    return new NextResponse("ok", { status: 200 });
  }

  // 2. Actual incoming SMS notification
  if (messageType !== "Notification") {
    return new NextResponse("ignored", { status: 200 });
  }

  let snsMessage: { Message: string };
  try {
    snsMessage = JSON.parse(rawBody);
  } catch {
    return new NextResponse("bad json", { status: 200 });
  }

  let smsData: { originationNumber?: string; messageBody?: string };
  try {
    smsData = JSON.parse(snsMessage.Message || "{}");
  } catch {
    return new NextResponse("bad sns payload", { status: 200 });
  }

  const phone = smsData.originationNumber || "";
  const text = (smsData.messageBody || "").trim();
  if (!phone || !text) {
    return new NextResponse("missing fields", { status: 200 });
  }

  const phoneDigits = normalizeDigits(phone);
  await connectDB();

  // Honor global opt-out without touching any handlers.
  const optedOut = await SmsOptOut.findOne({ phoneDigits });
  if (optedOut && !isHelp(text)) {
    // Still confirm STOP if they send it again.
    if (isStop(text)) {
      await sendSms(phone, tplStopConfirmationEs()).catch(() => {});
    }
    return new NextResponse("opted out", { status: 200 });
  }

  // Handlers in priority order. First to claim wins.
  const handlers: Array<() => Promise<HandlerResult>> = [
    () => handleReviewReply(phoneDigits, text),
  ];

  for (const h of handlers) {
    const result = await h();
    if (result.handled) {
      if (result.reply) {
        await sendSms(phone, result.reply).catch((err) => {
          console.error("[incoming-sms] reply send failed", err);
        });
      }
      return new NextResponse("ok", { status: 200 });
    }
  }

  // No handler claimed the message — log and move on.
  console.log(
    `[incoming-sms] unmatched from ${phone}: ${text.slice(0, 80)}`
  );
  return new NextResponse("ok", { status: 200 });
}
