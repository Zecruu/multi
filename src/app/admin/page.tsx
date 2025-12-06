"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Package,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  CreditCard,
} from "lucide-react";

interface DashboardData {
  stats: {
    totalClients: number;
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
    clientsChange: string;
    productsChange: string;
    ordersChange: string;
    revenueChange: string;
  };
  quickStats: {
    salesToday: number;
    ordersToday: number;
    lowStockItems: number;
    pendingPayments: number;
  };
  analytics: {
    grossRevenue: number;
    stripeFees: number;
    netRevenue: number;
    totalCost: number;
    grossProfit: number;
    profitMargin: string;
    taxRate: number;
  };
  recentOrders: Array<{
    id: string;
    client: string;
    total: number;
    status: string;
  }>;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US").format(num);
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch("/api/dashboard");
        if (res.ok) {
          const dashboardData = await res.json();
          setData(dashboardData);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Loading...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const stats = [
    {
      title: "Total Clients",
      value: formatNumber(data?.stats.totalClients || 0),
      change: data?.stats.clientsChange || "+0%",
      trend: data?.stats.clientsChange?.startsWith("+") ? "up" : "down",
      icon: Users,
    },
    {
      title: "Products",
      value: formatNumber(data?.stats.totalProducts || 0),
      change: data?.stats.productsChange || "+0%",
      trend: data?.stats.productsChange?.startsWith("+") ? "up" : "down",
      icon: Package,
    },
    {
      title: "Orders",
      value: formatNumber(data?.stats.totalOrders || 0),
      change: data?.stats.ordersChange || "+0%",
      trend: data?.stats.ordersChange?.startsWith("+") ? "up" : "down",
      icon: ShoppingCart,
    },
    {
      title: "Revenue",
      value: formatCurrency(data?.stats.totalRevenue || 0),
      change: data?.stats.revenueChange || "+0%",
      trend: data?.stats.revenueChange?.startsWith("+") ? "up" : "down",
      icon: DollarSign,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back! Here&apos;s what&apos;s happening with your store.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <div className="flex items-center mt-1">
                {stat.trend === "up" ? (
                  <ArrowUpRight className="w-4 h-4 text-green-500" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-red-500" />
                )}
                <span
                  className={`text-sm ${
                    stat.trend === "up" ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {stat.change}
                </span>
                <span className="text-sm text-muted-foreground ml-1">
                  from last month
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Profit Analytics */}
      {data?.analytics && (
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Profit Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="p-3 rounded-lg bg-background">
                <p className="text-xs text-muted-foreground">Gross Revenue</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(data.analytics.grossRevenue)}</p>
              </div>
              <div className="p-3 rounded-lg bg-background">
                <p className="text-xs text-muted-foreground">Stripe Fees</p>
                <p className="text-lg font-bold text-red-500">-{formatCurrency(data.analytics.stripeFees)}</p>
              </div>
              <div className="p-3 rounded-lg bg-background">
                <p className="text-xs text-muted-foreground">Net Revenue</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(data.analytics.netRevenue)}</p>
              </div>
              <div className="p-3 rounded-lg bg-background">
                <p className="text-xs text-muted-foreground">Total Cost</p>
                <p className="text-lg font-bold text-orange-500">-{formatCurrency(data.analytics.totalCost)}</p>
              </div>
              <div className="p-3 rounded-lg bg-background">
                <p className="text-xs text-muted-foreground">Gross Profit</p>
                <p className={`text-lg font-bold ${data.analytics.grossProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatCurrency(data.analytics.grossProfit)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-background">
                <p className="text-xs text-muted-foreground">Profit Margin</p>
                <p className={`text-lg font-bold ${parseFloat(data.analytics.profitMargin) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {data.analytics.profitMargin}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <Card className="lg:col-span-2 bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data?.recentOrders && data.recentOrders.length > 0 ? (
                data.recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-background"
                  >
                    <div>
                      <p className="font-medium text-foreground">{order.id}</p>
                      <p className="text-sm text-muted-foreground">{order.client}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-foreground">{formatCurrency(order.total)}</p>
                      <span
                        className={`text-xs px-2 py-1 rounded-full capitalize ${
                          order.status === "delivered"
                            ? "bg-green-500/20 text-green-500"
                            : order.status === "processing"
                            ? "bg-blue-500/20 text-blue-500"
                            : order.status === "shipped"
                            ? "bg-purple-500/20 text-purple-500"
                            : order.status === "pending"
                            ? "bg-yellow-500/20 text-yellow-500"
                            : "bg-gray-500/20 text-gray-500"
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">No orders yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-background">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sales Today</p>
                  <p className="font-medium text-foreground">{formatCurrency(data?.quickStats.salesToday || 0)}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-background">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <ShoppingCart className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Orders Today</p>
                  <p className="font-medium text-foreground">{data?.quickStats.ordersToday || 0}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-background">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/20">
                  <Package className="w-4 h-4 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Low Stock Items</p>
                  <p className="font-medium text-foreground">{data?.quickStats.lowStockItems || 0}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-background">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/20">
                  <TrendingDown className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending Payments</p>
                  <p className="font-medium text-foreground">{formatCurrency(data?.quickStats.pendingPayments || 0)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
