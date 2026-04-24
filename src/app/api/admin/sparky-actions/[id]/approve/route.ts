import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongodb";
import SparkyAction from "@/models/SparkyAction";
import Product from "@/models/Product";
import ActivityLog from "@/models/ActivityLog";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const sessionCookie = (await cookies()).get("admin_session");
  if (!sessionCookie) return null;
  try {
    const data = JSON.parse(Buffer.from(sessionCookie.value, "base64").toString());
    if (!["admin", "gerente"].includes(data.role)) return null;
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
  if (action.status !== "pending") {
    return NextResponse.json(
      { error: `action already ${action.status}` },
      { status: 400 }
    );
  }

  try {
    let affected = 0;
    const adminName = admin.name || admin.username || "Admin";

    if (action.actionType === "delete") {
      const result = await Product.deleteMany({ _id: { $in: action.productIds } });
      affected = result.deletedCount || 0;
    } else if (action.actionType === "archive") {
      const result = await Product.updateMany(
        { _id: { $in: action.productIds } },
        { $set: { status: "archived" } }
      );
      affected = result.modifiedCount || 0;
    }

    action.status = "executed";
    action.executedAt = new Date();
    action.executedBy = adminName;
    action.resultMessage = `${action.actionType === "delete" ? "Deleted" : "Archived"} ${affected} product${affected === 1 ? "" : "s"}`;
    await action.save();

    // Audit trail
    await ActivityLog.create({
      action: action.actionType === "delete" ? "bulk_deleted" : "bulk_archived",
      category: "product",
      description: `${adminName} approved Sparky: ${action.resultMessage} (filter: ${action.summary})`,
      userName: adminName,
      userRole: admin.role,
      targetType: "Product",
      metadata: {
        source: "sparky-action",
        actionId: String(action._id),
        actionType: action.actionType,
        matchCount: action.matchCount,
        affected,
      },
    });

    return NextResponse.json({
      ok: true,
      affected,
      message: action.resultMessage,
    });
  } catch (err) {
    action.status = "failed";
    action.resultMessage = (err as Error).message;
    await action.save();
    return NextResponse.json(
      { error: "execution failed", message: (err as Error).message },
      { status: 500 }
    );
  }
}
