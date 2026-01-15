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
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  UserCog,
  History,
  FileUp,
  User,
  Building,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const navigation = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Clients", href: "/admin/clients", icon: Users },
  { name: "Products", href: "/admin/products", icon: Package },
  { name: "Import Products", href: "/admin/import-products", icon: FileUp },
  { name: "Orders", href: "/admin/orders", icon: ShoppingCart },
  { name: "Ledger", href: "/admin/ledger", icon: BookOpen },
  { name: "Team", href: "/admin/team", icon: UserCog },
  { name: "History", href: "/admin/history", icon: History },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const sessionData = useSession();
  const session = sessionData?.data;
  const [collapsed, setCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(pathname.startsWith("/admin/settings"));

  const isAdmin = session?.user?.role === "admin";
  const isSettingsActive = pathname.startsWith("/admin/settings");

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
        {navigation.map((item) => {
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

        {/* Settings with submenu */}
        {collapsed ? (
          <Link
            href="/admin/settings/account"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              isSettingsActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
          </Link>
        ) : (
          <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
            <CollapsibleTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full",
                  isSettingsActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Settings className="w-5 h-5 flex-shrink-0" />
                <span className="flex-1 text-left">Settings</span>
                <ChevronDown className={cn(
                  "w-4 h-4 transition-transform",
                  settingsOpen && "rotate-180"
                )} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-4 space-y-1 mt-1">
              <Link
                href="/admin/settings/account"
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  pathname === "/admin/settings/account"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <User className="w-4 h-4 flex-shrink-0" />
                <span>Account</span>
              </Link>
              {isAdmin && (
                <Link
                  href="/admin/settings/business"
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    pathname === "/admin/settings/business"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Building className="w-4 h-4 flex-shrink-0" />
                  <span>Business</span>
                </Link>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}
      </nav>

      {/* Collapse Toggle */}
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
      </div>
    </aside>
  );
}
