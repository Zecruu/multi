"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Package, 
  Heart, 
  Settings, 
  MapPin, 
  Mail, 
  Calendar,
  ArrowLeft,
  ChevronRight,
  ShoppingBag
} from "lucide-react";

interface UserStats {
  totalOrders: number;
  wishlistCount: number;
  memberSince: string;
}

export default function AccountPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<UserStats>({
    totalOrders: 0,
    wishlistCount: 0,
    memberSince: "",
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/store/login?callbackUrl=/store/account");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchStats();
    }
  }, [status]);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      const [ordersRes, wishlistRes] = await Promise.all([
        fetch("/api/orders/user"),
        fetch("/api/wishlist"),
      ]);

      const ordersData = ordersRes.ok ? await ordersRes.json() : { orders: [] };
      const wishlistData = wishlistRes.ok ? await wishlistRes.json() : { items: [] };

      setStats({
        totalOrders: ordersData.orders?.length || 0,
        wishlistCount: wishlistData.items?.length || 0,
        memberSince: session?.user?.id ? new Date().toLocaleDateString() : "",
      });
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  const menuItems = [
    {
      title: "My Orders",
      description: "View your order history and track shipments",
      icon: Package,
      href: "/store/orders",
      badge: stats.totalOrders > 0 ? stats.totalOrders.toString() : undefined,
    },
    {
      title: "Wishlist",
      description: "Products you've saved for later",
      icon: Heart,
      href: "/store/wishlist",
      badge: stats.wishlistCount > 0 ? stats.wishlistCount.toString() : undefined,
    },
    {
      title: "Settings",
      description: "Manage your account settings and preferences",
      icon: Settings,
      href: "/store/settings",
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/store">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">My Account</h1>
          <p className="text-muted-foreground">Manage your account and view your activity</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <Card className="lg:col-span-1">
          <CardHeader className="text-center">
            <Avatar className="w-24 h-24 mx-auto mb-4">
              <AvatarImage src={session?.user?.image || ""} />
              <AvatarFallback className="text-2xl">
                {session?.user?.name?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <CardTitle>{session?.user?.name}</CardTitle>
            <CardDescription className="flex items-center justify-center gap-1">
              <Mail className="h-4 w-4" />
              {session?.user?.email}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Separator className="mb-4" />
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Member since {stats.memberSince || "Recently"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShoppingBag className="h-4 w-4" />
                <span>{stats.totalOrders} orders placed</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Menu Items */}
        <div className="lg:col-span-2 space-y-4">
          {menuItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <item.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{item.title}</h3>
                          {item.badge && (
                            <Badge variant="secondary">{item.badge}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
