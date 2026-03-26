import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function validateSyncKey(request: NextRequest): Promise<boolean> {
  const syncKey = request.headers.get("x-sync-key");
  if (!syncKey) return false;
  const validKey = process.env.SYNC_AGENT_KEY;
  if (!validKey) return false;
  return syncKey === validKey;
}

export async function POST(request: NextRequest) {
  if (!(await validateSyncKey(request))) {
    return NextResponse.json({ error: "Invalid sync key" }, { status: 401 });
  }

  try {
    const { subject, body, recipients } = await request.json();

    // Dynamic import to avoid issues if resend isn't configured
    const { getResend } = await import("@/lib/resend");
    const resend = getResend();
    const fromEmail = process.env.FROM_EMAIL || "Multi Electric Supply <noreply@multielectricsupply.com>";

    const emailRecipients = recipients?.length > 0
      ? recipients
      : [process.env.ADMIN_EMAIL || "admin@multielectricsupply.com"];

    await resend.emails.send({
      from: fromEmail,
      to: emailRecipients,
      subject: `[Sync Agent] ${subject}`,
      text: body,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1a1a2e; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0;">Multi Electric Supply</h2>
            <p style="margin: 5px 0 0; opacity: 0.8;">Sync Agent Notification</p>
          </div>
          <div style="background: #f8f9fa; padding: 20px; border: 1px solid #dee2e6; border-radius: 0 0 8px 8px;">
            <h3 style="margin-top: 0;">${subject}</h3>
            <pre style="background: white; padding: 15px; border-radius: 4px; border: 1px solid #dee2e6; white-space: pre-wrap; font-size: 14px;">${body}</pre>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to send notification", message: (err as Error).message },
      { status: 500 }
    );
  }
}
