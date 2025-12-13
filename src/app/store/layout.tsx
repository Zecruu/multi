import { StoreHeader } from "@/components/store/header";
import { StoreFooter } from "@/components/store/footer";
import { CartProvider } from "@/lib/cart-context";
import { WishlistProvider } from "@/lib/wishlist-context";
import { SessionProvider } from "@/components/providers/session-provider";
import { LanguageProvider } from "@/lib/language-context";

export const metadata = {
  title: "MultiElectric Supply - Quality Electrical Supplies",
  description: "Your trusted source for professional-grade electrical supplies. Shop wiring, outlets, panels, lighting, and more.",
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
