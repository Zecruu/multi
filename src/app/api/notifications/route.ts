import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "10");

    // Get recent orders as notifications (orders from last 24 hours or unread)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const recentOrders = await Order.find({
      createdAt: { $gte: oneDayAgo },
    })
      .populate("client", "name company")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const notifications = recentOrders.map((order: any) => ({
      id: order._id.toString(),
      type: "new_order",
      title: "New Order",
      message: `${order.client?.name || "Guest"} placed order ${order.orderNumber}`,
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      clientName: order.client?.name || "Guest",
      clientCompany: order.client?.company,
      total: order.total,
      createdAt: order.createdAt,
      read: false,
    }));

    // Count unread (all recent for now)
    const unreadCount = notifications.length;

    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}
