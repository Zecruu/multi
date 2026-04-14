"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type SubCategory = { name: string; slug: string };
type Category = {
  name: string;
  slug: string;
  sub: SubCategory[];
};

function subSlug(sub: string) {
  return sub
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

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

export default function MobileNav() {
  const [open, setOpen] = useState(false);
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

  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild className="lg:hidden">
        <Button variant="ghost" size="icon" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>

        <nav className="mt-4 flex flex-col">
          <Link
            href="/store"
            onClick={close}
            className="px-3 py-3 text-sm font-semibold uppercase border-b hover:bg-muted"
          >
            Home
          </Link>

          <Accordion type="multiple" className="w-full">
            {categories.map((cat) => (
              <AccordionItem key={cat.slug} value={cat.slug}>
                <AccordionTrigger className="px-3 text-sm font-semibold uppercase">
                  {cat.name}
                </AccordionTrigger>
                <AccordionContent className="px-3">
                  <ul className="flex flex-col gap-1">
                    <li>
                      <Link
                        href={`/store/products?category=${encodeURIComponent(cat.slug)}`}
                        onClick={close}
                        className="block py-2 text-sm font-medium text-primary"
                      >
                        View all {cat.name}
                      </Link>
                    </li>
                    {cat.sub.map((sub) => (
                      <li key={sub.slug}>
                        <Link
                          href={`/store/products?category=${encodeURIComponent(sub.slug)}`}
                          onClick={close}
                          className="block py-2 text-sm text-muted-foreground hover:text-foreground"
                        >
                          {sub.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <a
            href="tel:7879630569"
            onClick={close}
            className="px-3 py-3 text-sm font-semibold uppercase border-b hover:bg-muted"
          >
            Contact Us
          </a>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
