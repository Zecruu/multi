"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const AdminSidebar = dynamic(
  () => import("@/components/admin/sidebar").then((mod) => mod.AdminSidebar),
  { ssr: false }
);

const AdminHeader = dynamic(
  () => import("@/components/admin/header").then((mod) => mod.AdminHeader),
  { ssr: false }
);

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Don't show sidebar/header on login page
  const isLoginPage = pathname === "/admin/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <AdminHeader />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
