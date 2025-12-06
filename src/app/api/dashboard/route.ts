import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";
import Client from "@/models/Client";
import Order from "@/models/Order";

// Stripe fee calculation (2.9% + $0.30 per transaction)
const STRIPE_PERCENTAGE_FEE = 0.029;
const STRIPE_FIXED_FEE = 0.30;

// Puerto Rico sales tax rate (11.5% - combined state + municipal)
export const PR_TAX_RATE = 0.115;

export function calculateStripeFee(amount: number): number {
  return amount * STRIPE_PERCENTAGE_FEE + STRIPE_FIXED_FEE;
}

export function calculateNetRevenue(grossAmount: number): number {
  const stripeFee = calculateStripeFee(grossAmount);
  return grossAmount - stripeFee;
}

export function calculateProfitMargin(revenue: number, cost: number): number {
  if (revenue === 0) return 0;
  return ((revenue - cost) / revenue) * 100;
}

export async function GET() {
  try {
    await connectDB();

    // Get current date info
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Fetch counts
    const [totalClients, totalProducts, totalOrders, lastMonthClients, lastMonthProducts, lastMonthOrders] = await Promise.all([
      Client.countDocuments(),
      Product.countDocuments(),
      Order.countDocuments(),
      Client.countDocuments({ createdAt: { $lt: startOfMonth } }),
      Product.countDocuments({ createdAt: { $lt: startOfMonth } }),
      Order.countDocuments({ createdAt: { $lt: startOfMonth } }),
    ]);

    // Calculate revenue from orders
    const revenueAgg = await Order.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      { $group: { _id: null, total: { $sum: "$total" }, cost: { $sum: "$totalCost" } } }
    ]);

    const lastMonthRevenueAgg = await Order.aggregate([
      { $match: { status: { $ne: "cancelled" }, createdAt: { $lt: startOfMonth } } },
      { $group: { _id: null, total: { $sum: "$total" } } }
    ]);

    const totalRevenue = revenueAgg[0]?.total || 0;
    const totalCost = revenueAgg[0]?.cost || 0;
    const lastMonthRevenue = lastMonthRevenueAgg[0]?.total || 0;

    // Calculate changes
    const clientsChange = lastMonthClients > 0 
      ? ((totalClients - lastMonthClients) / lastMonthClients * 100).toFixed(1)
      : "0";
    const productsChange = lastMonthProducts > 0 
      ? ((totalProducts - lastMonthProducts) / lastMonthProducts * 100).toFixed(1)
      : "0";
    const ordersChange = lastMonthOrders > 0 
      ? ((totalOrders - lastMonthOrders) / lastMonthOrders * 100).toFixed(1)
      : "0";
    const revenueChange = lastMonthRevenue > 0 
      ? ((totalRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)
      : "0";

    // Today's stats
    const todayOrdersAgg = await Order.aggregate([
      { $match: { createdAt: { $gte: startOfToday }, status: { $ne: "cancelled" } } },
      { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } }
    ]);

    const salesToday = todayOrdersAgg[0]?.total || 0;
    const ordersToday = todayOrdersAgg[0]?.count || 0;

    // Low stock items
    const lowStockItems = await Product.countDocuments({
      $expr: { $lte: ["$quantity", "$lowStockThreshold"] }
    });

    // Pending payments (orders with pending status)
    const pendingPaymentsAgg = await Order.aggregate([
      { $match: { status: "pending" } },
      { $group: { _id: null, total: { $sum: "$total" } } }
    ]);
    const pendingPayments = pendingPaymentsAgg[0]?.total || 0;

    // Recent orders
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Calculate profit analytics
    const netRevenue = calculateNetRevenue(totalRevenue);
    const stripeFees = totalRevenue - netRevenue;
    const grossProfit = netRevenue - totalCost;
    const profitMargin = calculateProfitMargin(netRevenue, totalCost);

    return NextResponse.json({
      stats: {
        totalClients,
        totalProducts,
        totalOrders,
        totalRevenue,
        clientsChange: `${parseFloat(clientsChange) >= 0 ? '+' : ''}${clientsChange}%`,
        productsChange: `${parseFloat(productsChange) >= 0 ? '+' : ''}${productsChange}%`,
        ordersChange: `${parseFloat(ordersChange) >= 0 ? '+' : ''}${ordersChange}%`,
        revenueChange: `${parseFloat(revenueChange) >= 0 ? '+' : ''}${revenueChange}%`,
      },
      quickStats: {
        salesToday,
        ordersToday,
        lowStockItems,
        pendingPayments,
      },
      analytics: {
        grossRevenue: totalRevenue,
        stripeFees,
        netRevenue,
        totalCost,
        grossProfit,
        profitMargin: profitMargin.toFixed(2),
        taxRate: PR_TAX_RATE * 100,
      },
      recentOrders: recentOrders.map((order: { orderNumber?: string; _id: { toString(): string }; clientName?: string; customerEmail?: string; total?: number; status?: string }) => ({
        id: order.orderNumber || order._id.toString(),
        client: order.clientName || order.customerEmail || "Guest",
        total: order.total || 0,
        status: order.status || "pending",
      })),
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
