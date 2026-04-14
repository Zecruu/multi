"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";

const CONTACT_PHONE = "7879630569";

function formatPhone(p: string) {
  return `(${p.slice(0, 3)}) ${p.slice(3, 6)}-${p.slice(6)}`;
}

async function handleContactClick(e: React.MouseEvent<HTMLAnchorElement>) {
  const isMobile =
    typeof window !== "undefined" &&
    window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  if (isMobile) return; // let tel: link proceed
  e.preventDefault();
  try {
    await navigator.clipboard.writeText(CONTACT_PHONE);
    toast.success(`Copied ${formatPhone(CONTACT_PHONE)} to clipboard`);
  } catch {
    toast.error("Could not copy number");
  }
}

type SubCategory = { name: string; slug: string };
type Category = {
  name: string;
  slug: string;
  sub: SubCategory[];
};

const FALLBACK_CATEGORIES: Category[] = [
  {
    name: "Tools",
    slug: "tools",
    sub: [
      "Power Tools & Testers",
      "Hand Tools",
      "Cutters",
      "Fish Tapes",
      "Measuring Devices",
      "Tool Accessories",
      "Tool Kits",
      "Batteries & Chargers",
      "Testers",
    ].map((n) => ({ name: n, slug: subSlug(n) })),
  },
  {
    name: "All Products",
    slug: "products",
    sub: [
      "Wiring & Cable",
      "Panels & Breakers",
      "Conduit & Fittings",
      "Lighting",
      "Safety & PPE",
    ].map((n) => ({ name: n, slug: subSlug(n) })),
  },
  {
    name: "Shop by Brand",
    slug: "brands",
    sub: ["Klein Tools", "Southwire", "Hubbell", "Leviton", "Square D"].map(
      (n) => ({ name: n, slug: subSlug(n) })
    ),
  },
];

function subSlug(sub: string) {
  return sub
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

type ApiCategory = {
  _id: string;
  name: string;
  slug: string;
  parentId?: string | null;
};

function buildHierarchy(list: ApiCategory[]): Category[] {
  const parents = list.filter((c) => !c.parentId);
  if (parents.length === 0) return [];
  return parents.map((p) => ({
    name: p.name,
    slug: p.slug,
    sub: list
      .filter((c) => c.parentId === p._id)
      .map((c) => ({ name: c.name, slug: c.slug })),
  }));
}

export default function NavBar() {
  const [categories, setCategories] = useState<Category[]>(FALLBACK_CATEGORIES);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/categories?active=true");
        if (!res.ok) return;
        const data = await res.json();
        const list: unknown = data?.categories;
        if (!Array.isArray(list) || list.length === 0) return;
        const hier = buildHierarchy(list as ApiCategory[]);
        if (!cancelled && hier.length > 0) setCategories(hier);
      } catch {
        // keep fallback
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="hidden lg:block border-t">
      <div className="container mx-auto px-4">
        <NavigationMenu className="max-w-none justify-start">
          <NavigationMenuList className="justify-start gap-1">
            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <Link href="/store" className={navigationMenuTriggerStyle()}>
                  HOME
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>

            {categories.map((cat) => (
              <MegaItem key={cat.slug} label={cat.name} category={cat} />
            ))}

            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <a
                  href={`tel:${CONTACT_PHONE}`}
                  onClick={handleContactClick}
                  className={navigationMenuTriggerStyle()}
                >
                  CONTACT US
                </a>
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>
    </div>
  );
}

function MegaItem({ label, category }: { label: string; category: Category }) {
  const hasSubs = category.sub.length > 0;
  if (!hasSubs) {
    return (
      <NavigationMenuItem>
        <NavigationMenuLink asChild>
          <Link
            href={`/store/products?category=${encodeURIComponent(category.slug)}`}
            className={cn(navigationMenuTriggerStyle(), "uppercase")}
          >
            {label}
          </Link>
        </NavigationMenuLink>
      </NavigationMenuItem>
    );
  }
  const columns = chunk(category.sub, Math.ceil(category.sub.length / 2) || 1);
  return (
    <NavigationMenuItem>
      <NavigationMenuTrigger className="uppercase">{label}</NavigationMenuTrigger>
      <NavigationMenuContent>
        <div className="p-6 w-[520px] grid grid-cols-2 gap-x-8 gap-y-2">
          {columns.map((col, i) => (
            <ul key={i} className="space-y-2">
              {col.map((sub) => (
                <li key={sub.slug}>
                  <NavigationMenuLink asChild>
                    <Link
                      href={`/store/products?category=${encodeURIComponent(sub.slug)}`}
                      className="block rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                    >
                      {sub.name}
                    </Link>
                  </NavigationMenuLink>
                </li>
              ))}
            </ul>
          ))}
          <div className="col-span-2 pt-2 mt-2 border-t">
            <NavigationMenuLink asChild>
              <Link
                href={`/store/products?category=${encodeURIComponent(category.slug)}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                View all {category.name} →
              </Link>
            </NavigationMenuLink>
          </div>
        </div>
      </NavigationMenuContent>
    </NavigationMenuItem>
  );
}
