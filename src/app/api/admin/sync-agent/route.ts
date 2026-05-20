import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  generateSyncKey,
  getSyncKey,
  setSyncKey,
  verifySyncKey,
} from "@/lib/sync-agent-key";

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

// GET - Sync agent info.
//
// Two callers:
//   1. Admin UI — authenticated via admin_session cookie.
//   2. Sync agent Test Connection — sends x-sync-key header.
// Either is sufficient.
export async function GET(request: NextRequest) {
  const admin = await getAdminUser();
  const providedKey = request.headers.get("x-sync-key");
  const hasValidSyncKey = await verifySyncKey(providedKey);

  if (!admin && !hasValidSyncKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const syncKey = await getSyncKey();

  // Keep this in sync with sync-agent/package.json on every release.
  const LATEST_VERSION = "1.1.3";
  return NextResponse.json({
    version: LATEST_VERSION,
    hasSyncKey: !!syncKey,
    syncKeyPreview: syncKey ? `${syncKey.substring(0, 8)}...` : null,
    // Direct .exe download — bypasses the GitHub release page and grabs
    // the installer in one click.
    downloadUrl: `https://github.com/Zecruu/multi-electric-sync/releases/download/v${LATEST_VERSION}/MultiElectric-Sync-Setup-${LATEST_VERSION}.exe`,
    releasesUrl: "https://github.com/Zecruu/multi-electric-sync/releases/latest",
    repo: "Zecruu/multi-electric-sync",
  });
}

// POST - Generate and persist a new sync key (admin only).
export async function POST(request: NextRequest) {
  const admin = await getAdminUser();
  if (!admin || admin.role !== "admin") {
    return NextResponse.json(
      { error: "Unauthorized - Admin only" },
      { status: 401 }
    );
  }

  const { action } = await request.json();

  if (action === "generate-key") {
    const newKey = generateSyncKey();
    await setSyncKey(newKey, admin.name);
    return NextResponse.json({
      syncKey: newKey,
      message:
        "Key saved. Paste it into the sync agent's Settings → Sync Key field, then restart the agent.",
    });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
