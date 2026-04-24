import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

export const dynamic = "force-dynamic";

async function getAdminUser() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("admin_session");
  if (!sessionCookie) return null;

  try {
    const sessionData = JSON.parse(
      Buffer.from(sessionCookie.value, "base64").toString()
    );
    if (sessionData.exp && sessionData.exp < Date.now()) return null;
    return {
      name: sessionData.name || sessionData.username || "Admin",
      role: sessionData.role || "admin",
    };
  } catch {
    return null;
  }
}

// GET - Get sync agent info (version, download URL, sync key status).
//
// Two callers hit this endpoint:
//   1. The admin UI — authenticated via admin_session cookie.
//   2. The sync agent's "Test Connection" action — sends x-sync-key header.
// Either is sufficient.
export async function GET(request: NextRequest) {
  const admin = await getAdminUser();
  const providedKey = request.headers.get("x-sync-key");
  const expectedKey = process.env.SYNC_AGENT_KEY;
  const hasValidSyncKey =
    !!providedKey && !!expectedKey && providedKey === expectedKey;

  if (!admin && !hasValidSyncKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    version: "1.0.0",
    hasSyncKey: !!expectedKey,
    syncKeyPreview: expectedKey ? `${expectedKey.substring(0, 8)}...` : null,
    downloadUrl: "https://github.com/Zecruu/multi-electric-sync/releases/latest",
    repo: "Zecruu/multi-electric-sync",
  });
}

// POST - Generate a new sync key
export async function POST(request: NextRequest) {
  const admin = await getAdminUser();
  if (!admin || admin.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized - Admin only" }, { status: 401 });
  }

  const { action } = await request.json();

  if (action === "generate-key") {
    // Generate a secure random key
    const newKey = `mse_${crypto.randomBytes(32).toString("hex")}`;

    // Note: In production, this should be saved to database or env management
    // For now, return it to be manually set in .env
    return NextResponse.json({
      syncKey: newKey,
      message: "Add this key to your .env file as SYNC_AGENT_KEY and to the agent's config.yaml",
    });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
