"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  UserCog,
  History,
  FileUp,
  User,
  Store,
  RefreshCw,
  Star,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function AdminSidebar() {
  const pathname = usePathname();
  const sessionResult = useSession();
  const session = sessionResult?.data;
  const [collapsed, setCollapsed] = useState(false);

  const userRole = session?.user?.role;
  const isAdmin = userRole === "admin";

  // Navigation items - some are conditional based on role
  const navigation = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard, roles: ["admin", "gerente", "employee"] },
    { name: "Clients", href: "/admin/clients", icon: Users, roles: ["admin", "gerente", "employee"] },
    { name: "Products", href: "/admin/products", icon: Package, roles: ["admin", "gerente", "employee"] },
    { name: "Import Products", href: "/admin/import-products", icon: FileUp, roles: ["admin", "gerente", "employee"] },
    { name: "Imports & Sparky", href: "/admin/imports", icon: FileSpreadsheet, roles: ["admin", "gerente", "employee"] },
    { name: "Orders", href: "/admin/orders", icon: ShoppingCart, roles: ["admin", "gerente", "employee"] },
    { name: "Reviews & Reputation", href: "/admin/reviews", icon: Star, roles: ["admin", "gerente", "employee"] },
    { name: "Ledger", href: "/admin/ledger", icon: BookOpen, roles: ["admin", "gerente", "employee"] },
    { name: "Team", href: "/admin/team", icon: UserCog, roles: ["admin"] },
    { name: "History", href: "/admin/history", icon: History, roles: ["admin", "gerente", "employee"] },
    { name: "Account Settings", href: "/admin/account-settings", icon: User, roles: ["admin", "gerente", "employee"] },
    { name: "Sync Agent", href: "/admin/sync-agent", icon: RefreshCw, roles: ["admin"] },
    { name: "Store Settings", href: "/admin/store-settings", icon: Store, roles: ["admin"] },
  ];

  // Filter navigation based on user role
  const visibleNavigation = navigation.filter(item =>
    !userRole || item.roles.includes(userRole)
  );

  return (
    <aside
      className={cn(
        "flex flex-col bg-card border-r border-border transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-border">
        <Link href="/admin" className="flex items-center gap-2">
          <Image
            src="/logo.jpg"
            alt="Multi Electric Supply"
            width={32}
            height={32}
            className="w-8 h-8 object-contain"
          />
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold text-foreground tracking-wide">
                MultiElectric
              </span>
              <span className="text-[10px] text-muted-foreground -mt-1">
                SUPPLY
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {visibleNavigation.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle & Version */}
      <div className="p-2 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </Button>
        {!collapsed && (
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            v1.0.3
          </p>
        )}
      </div>
    </aside>
  );
}
