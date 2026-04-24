import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongodb";
import SparkyAction from "@/models/SparkyAction";

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

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await connectDB();

  const action = await SparkyAction.findById(id);
  if (!action) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  action.status = "rejected";
  action.resultMessage = `Rejected by ${admin.name || admin.username || "Admin"}`;
  await action.save();

  return NextResponse.json({ ok: true });
}
