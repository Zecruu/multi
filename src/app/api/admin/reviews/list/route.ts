import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongodb";
import ReviewRequest from "@/models/ReviewRequest";

async function isAdmin() {
  const c = (await cookies()).get("admin_session");
  if (!c) return false;
  try {
    const d = JSON.parse(Buffer.from(c.value, "base64").toString());
    return d.role === "admin" || d.role === "gerente" || d.role === "employee";
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await connectDB();

  const sp = request.nextUrl.searchParams;
  const status = sp.get("status");
  const search = sp.get("search")?.trim();
  const limit = Math.min(Math.max(Number(sp.get("limit") || 50), 1), 200);

  const q: Record<string, unknown> = {};
  if (status && status !== "all") q.status = status;
  if (search) {
    const digits = search.replace(/\D/g, "");
    const or: Record<string, unknown>[] = [
      { firstName: { $regex: search, $options: "i" } },
    ];
    if (digits.length >= 4) or.push({ phoneDigits: { $regex: digits } });
    q.$or = or;
  }

  const [items, stats] = await Promise.all([
    ReviewRequest.find(q).sort({ sentAt: -1 }).limit(limit).lean(),
    ReviewRequest.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          responded: {
            $sum: {
              $cond: [
                { $in: ["$status", ["rated_positive", "rated_negative", "followed_up"]] },
                1,
                0,
              ],
            },
          },
          avgRating: { $avg: "$rating" },
          positive: {
            $sum: { $cond: [{ $gte: ["$rating", 4] }, 1, 0] },
          },
          negative: {
            $sum: { $cond: [{ $lte: ["$rating", 3] }, 1, 0] },
          },
        },
      },
    ]),
  ]);

  return NextResponse.json({
    items: items.map((r) => ({
      id: String(r._id),
      firstName: r.firstName,
      phone: r.phone,
      status: r.status,
      rating: r.rating,
      provider: r.provider,
      sentBy: r.sentBy,
      sentAt: r.sentAt,
      respondedAt: r.respondedAt,
      conversation: r.conversation,
      feedbackText: r.feedbackText,
    })),
    stats: stats[0] || { total: 0, responded: 0, avgRating: 0, positive: 0, negative: 0 },
  });
}
