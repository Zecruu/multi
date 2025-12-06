import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import LedgerEntry from "@/models/LedgerEntry";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const type = searchParams.get("type");
    const category = searchParams.get("category");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const query: Record<string, unknown> = {};

    if (type && type !== "all") {
      query.type = type;
    }

    if (category && category !== "all") {
      query.category = category;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        (query.date as Record<string, Date>).$gte = new Date(startDate);
      }
      if (endDate) {
        (query.date as Record<string, Date>).$lte = new Date(endDate);
      }
    }

    const skip = (page - 1) * limit;

    const [entries, total, summary] = await Promise.all([
      LedgerEntry.find(query).sort({ date: -1 }).skip(skip).limit(limit),
      LedgerEntry.countDocuments(query),
      LedgerEntry.aggregate([
        { $match: query },
        {
          $group: {
            _id: "$type",
            total: { $sum: "$amount" },
          },
        },
      ]),
    ]);

    const summaryMap = summary.reduce((acc, item) => {
      acc[item._id] = item.total;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      entries,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      summary: {
        income: summaryMap.income || 0,
        expense: summaryMap.expense || 0,
        refund: summaryMap.refund || 0,
        adjustment: summaryMap.adjustment || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching ledger entries:", error);
    return NextResponse.json(
      { error: "Failed to fetch ledger entries" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    // Adjust amount sign based on type
    if (body.type === "expense" || body.type === "refund") {
      body.amount = -Math.abs(body.amount);
    } else if (body.type === "income") {
      body.amount = Math.abs(body.amount);
    }

    const entry = await LedgerEntry.create(body);

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("Error creating ledger entry:", error);
    return NextResponse.json(
      { error: "Failed to create ledger entry" },
      { status: 500 }
    );
  }
}
