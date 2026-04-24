import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongodb";
import ActivityLog from "@/models/ActivityLog";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const sessionCookie = (await cookies()).get("admin_session");
  if (!sessionCookie) return null;
  try {
    const data = JSON.parse(Buffer.from(sessionCookie.value, "base64").toString());
    if (!["admin", "gerente", "employee"].includes(data.role)) return null;
    return data;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") || 50), 200);
  const since = searchParams.get("since");

  await connectDB();

  const filter: Record<string, unknown> = { "metadata.source": "sparky" };
  if (since) {
    const sinceDate = new Date(since);
    if (!isNaN(sinceDate.getTime())) {
      filter.createdAt = { $gte: sinceDate };
    }
  }

  const entries = await ActivityLog.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return NextResponse.json({ entries });
}
