import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ActivityLog from "@/models/ActivityLog";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get("category");
    const action = searchParams.get("action");
    const limit = parseInt(searchParams.get("limit") || "50");
    const page = parseInt(searchParams.get("page") || "1");
    const search = searchParams.get("search");

    const query: any = {};

    if (category && category !== "all") {
      query.category = category;
    }

    if (action && action !== "all") {
      query.action = action;
    }

    if (search) {
      query.$or = [
        { description: { $regex: search, $options: "i" } },
        { userName: { $regex: search, $options: "i" } },
        { targetName: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      ActivityLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ActivityLog.countDocuments(query),
    ]);

    // Get stats
    const stats = await ActivityLog.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
    ]);

    const categoryStats = stats.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats: categoryStats,
    });
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity logs" },
      { status: 500 }
    );
  }
}

