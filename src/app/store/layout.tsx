import { Metadata } from "next";
import { StoreHeader } from "@/components/store/header";
import { StoreFooter } from "@/components/store/footer";
import { CartProvider } from "@/lib/cart-context";
import { WishlistProvider } from "@/lib/wishlist-context";
import { SessionProvider } from "@/components/providers/session-provider";
import { LanguageProvider } from "@/lib/language-context";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://multielectricsupply.com";

export const metadata: Metadata = {
  title: {
    default: "MultiElectric Supply - Quality Electrical Supplies",
    template: "%s | MultiElectric Supply",
  },
  description: "Your trusted source for professional-grade electrical supplies. Shop wiring, outlets, panels, lighting, and more.",
  keywords: ["electrical supplies", "wiring", "outlets", "panels", "lighting", "electrical equipment", "MultiElectric Supply"],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: "MultiElectric Supply",
    title: "MultiElectric Supply - Quality Electrical Supplies",
    description: "Your trusted source for professional-grade electrical supplies. Shop wiring, outlets, panels, lighting, and more.",
    images: [
      {
        url: `${BASE_URL}/logo.jpg`,
        width: 1200,
        height: 630,
        alt: "MultiElectric Supply",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MultiElectric Supply - Quality Electrical Supplies",
    description: "Your trusted source for professional-grade electrical supplies.",
    images: [`${BASE_URL}/logo.jpg`],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: BASE_URL,
  },
};

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <LanguageProvider>
        <CartProvider>
          <WishlistProvider>
            <div className="flex min-h-screen flex-col">
              <StoreHeader />
              <main className="flex-1">{children}</main>
              <StoreFooter />
            </div>
          </WishlistProvider>
        </CartProvider>
      </LanguageProvider>
    </SessionProvider>
  );
}
