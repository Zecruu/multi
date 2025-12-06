"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Package, 
  ArrowLeft, 
  ShoppingBag,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  ChevronRight,
  Calendar,
  CreditCard
} from "lucide-react";

interface OrderItem {
  product: string;
  productName: string;
  productSku: string;
  productImage?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface Order {
  _id: string;
  orderNumber: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  shippedAt?: string;
  deliveredAt?: string;
  trackingNumber?: string;
}

const statusConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  pending: { label: "Pending", icon: Clock, color: "bg-yellow-500/10 text-yellow-500" },
  confirmed: { label: "Confirmed", icon: CheckCircle, color: "bg-blue-500/10 text-blue-500" },
  processing: { label: "Processing", icon: Package, color: "bg-purple-500/10 text-purple-500" },
  shipped: { label: "Shipped", icon: Truck, color: "bg-indigo-500/10 text-indigo-500" },
  delivered: { label: "Delivered", icon: CheckCircle, color: "bg-green-500/10 text-green-500" },
  cancelled: { label: "Cancelled", icon: XCircle, color: "bg-red-500/10 text-red-500" },
  refunded: { label: "Refunded", icon: XCircle, color: "bg-gray-500/10 text-gray-500" },
};

const paymentStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-yellow-500/10 text-yellow-500" },
  paid: { label: "Paid", color: "bg-green-500/10 text-green-500" },
  failed: { label: "Failed", color: "bg-red-500/10 text-red-500" },
  refunded: { label: "Refunded", color: "bg-gray-500/10 text-gray-500" },
};

export default function OrdersPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/store/login?callbackUrl=/store/orders");
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (authStatus === "authenticated") {
      fetchOrders();
    }
  }, [authStatus, statusFilter]);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      
      const response = await fetch(`/api/orders/user?${params}`);
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (authStatus === "loading") {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (authStatus === "unauthenticated") {
    return null;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getFirstProductImage = (items: OrderItem[]) => {
    const itemWithImage = items.find(item => item.productImage);
    return itemWithImage?.productImage;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/store/account">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="h-8 w-8" />
            My Orders
          </h1>
          <p className="text-muted-foreground">
            View and track your order history
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Orders</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {orders.length} {orders.length === 1 ? "order" : "orders"}
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-24 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <Card className="p-12 text-center">
          <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No orders yet</h2>
          <p className="text-muted-foreground mb-6">
            When you place orders, they will appear here.
          </p>
          <Link href="/store/products">
            <Button>Start Shopping</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const statusInfo = statusConfig[order.status] || statusConfig.pending;
            const paymentInfo = paymentStatusConfig[order.paymentStatus] || paymentStatusConfig.pending;
            const StatusIcon = statusInfo.icon;
            const isExpanded = expandedOrder === order._id;
            const firstImage = getFirstProductImage(order.items);

            return (
              <Card key={order._id} className="overflow-hidden">
                <CardHeader 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setExpandedOrder(isExpanded ? null : order._id)}
                >
                  <div className="flex items-center gap-4">
                    {/* Order Image */}
                    <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                      {firstImage ? (
                        <img 
                          src={firstImage} 
                          alt="Order item" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>

                    {/* Order Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-lg">
                          Order #{order.orderNumber}
                        </CardTitle>
                        <Badge className={statusInfo.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusInfo.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(order.createdAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <CreditCard className="h-4 w-4" />
                          <Badge variant="outline" className={paymentInfo.color}>
                            {paymentInfo.label}
                          </Badge>
                        </span>
                      </div>
                      <p className="text-sm mt-1">
                        {order.items.length} {order.items.length === 1 ? "item" : "items"}
                      </p>
                    </div>

                    {/* Total & Expand */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-2xl font-bold">${order.total.toFixed(2)}</p>
                      <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform mx-auto mt-2 ${isExpanded ? "rotate-90" : ""}`} />
                    </div>
                  </div>
                </CardHeader>

                {/* Expanded Details */}
                {isExpanded && (
                  <CardContent className="border-t bg-muted/30">
                    <div className="py-4 space-y-4">
                      {/* Order Items */}
                      <div>
                        <h4 className="font-semibold mb-3">Items</h4>
                        <div className="space-y-3">
                          {order.items.map((item, index) => (
                            <div key={index} className="flex items-center gap-4 p-3 bg-background rounded-lg">
                              <div className="w-16 h-16 rounded bg-muted flex items-center justify-center overflow-hidden">
                                {item.productImage ? (
                                  <img 
                                    src={item.productImage} 
                                    alt={item.productName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Package className="h-6 w-6 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{item.productName}</p>
                                <p className="text-sm text-muted-foreground">SKU: {item.productSku}</p>
                                <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold">${item.totalPrice.toFixed(2)}</p>
                                <p className="text-sm text-muted-foreground">${item.unitPrice.toFixed(2)} each</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <Separator />

                      {/* Order Summary */}
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold mb-3">Order Timeline</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Order Placed</span>
                              <span>{formatDate(order.createdAt)}</span>
                            </div>
                            {order.shippedAt && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Shipped</span>
                                <span>{formatDate(order.shippedAt)}</span>
                              </div>
                            )}
                            {order.deliveredAt && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Delivered</span>
                                <span>{formatDate(order.deliveredAt)}</span>
                              </div>
                            )}
                            {order.trackingNumber && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Tracking #</span>
                                <span className="font-mono">{order.trackingNumber}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-3">Order Total</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Subtotal</span>
                              <span>${order.subtotal.toFixed(2)}</span>
                            </div>
                            {order.discount > 0 && (
                              <div className="flex justify-between text-green-600">
                                <span>Discount</span>
                                <span>-${order.discount.toFixed(2)}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Tax</span>
                              <span>${order.tax.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Shipping</span>
                              <span>{order.shipping > 0 ? `$${order.shipping.toFixed(2)}` : "Free"}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between font-semibold text-base">
                              <span>Total</span>
                              <span>${order.total.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
