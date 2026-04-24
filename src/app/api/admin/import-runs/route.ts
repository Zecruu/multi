import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongodb";
import ImportRun from "@/models/ImportRun";

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
  const source = searchParams.get("source");
  const limit = Math.min(Number(searchParams.get("limit") || 30), 100);
  const offset = Math.max(Number(searchParams.get("offset") || 0), 0);

  await connectDB();

  const filter: Record<string, unknown> = {};
  if (source === "sync-agent" || source === "admin-ui") {
    filter.source = source;
  }

  const [runs, total] = await Promise.all([
    ImportRun.find(filter)
      .sort({ startedAt: -1 })
      .skip(offset)
      .limit(limit)
      .select("-products -errorList")
      .lean(),
    ImportRun.countDocuments(filter),
  ]);

  return NextResponse.json({ runs, total, limit, offset });
}
