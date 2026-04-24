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

// Returns the most recent pending Sparky action, if any. The products
// page polls this to know whether to render the review banner.
export async function GET(_request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await connectDB();
  const pending = await SparkyAction.findOne({
    status: "pending",
    expiresAt: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .lean();
  return NextResponse.json({ action: pending });
}
