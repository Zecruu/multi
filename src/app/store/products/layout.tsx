import { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://multielectricsupply.com";

export const metadata: Metadata = {
  title: "All Products",
  description: "Browse our complete selection of professional-grade electrical supplies. Shop wiring, cables, outlets, panels, lighting, switches, and more at MultiElectric Supply.",
  keywords: [
    "electrical supplies",
    "electrical products",
    "wiring",
    "cables", 
    "outlets",
    "panels",
    "lighting",
    "switches",
    "electrical equipment",
    "buy electrical supplies online",
  ],
  openGraph: {
    title: "All Products | MultiElectric Supply",
    description: "Browse our complete selection of professional-grade electrical supplies.",
    url: `${BASE_URL}/store/products`,
    type: "website",
    images: [
      {
        url: `${BASE_URL}/logo.jpg`,
        width: 1200,
        height: 630,
        alt: "MultiElectric Supply Products",
      },
    ],
  },
  alternates: {
    canonical: `${BASE_URL}/store/products`,
  },
};

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
