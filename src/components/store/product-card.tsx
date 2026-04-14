"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { ShoppingCart, Heart, Package } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useWishlist } from "@/lib/wishlist-context";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useLanguage, translations } from "@/lib/language-context";

interface ProductCardProps {
  product: {
    _id: string;
    name: string;
    nameEs?: string;
    slug: string;
    sku: string;
    price: number;
    compareAtPrice?: number;
    isOnSale?: boolean;
    salePrice?: number;
    images: { url: string; key: string; isPrimary: boolean }[];
    category: string;
    quantity: number;
    status: string;
    isFeatured?: boolean;
  };
  variant?: "default" | "compact";
}

export function ProductCard({ product, variant = "default" }: ProductCardProps) {
  const { addItem, isInCart } = useCart();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { status } = useSession();
  const { language, t } = useLanguage();

  // Get localized product name
  const displayName = (language === "es" && product.nameEs) ? product.nameEs : product.name;

  const primaryImage = product.images?.find((img) => img.isPrimary)?.url || product.images?.[0]?.url;
  
  // Calculate display price and discount
  // If on sale with a valid sale price, use sale price; otherwise use regular price
  const hasValidSale = product.isOnSale && product.salePrice && product.salePrice < product.price;
  const displayPrice = hasValidSale ? product.salePrice! : product.price;
  const originalPrice = hasValidSale ? product.price : (product.compareAtPrice && product.compareAtPrice > product.price ? product.compareAtPrice : undefined);
  const discount = originalPrice && originalPrice > displayPrice
    ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100)
    : 0;
  
  const inStock = product.quantity > 0;
  const inCart = isInCart(product._id);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!inStock) {
      toast.error("This product is out of stock");
      return;
    }

    addItem({
      productId: product._id,
      name: product.name,
      price: displayPrice,
      image: primaryImage,
      sku: product.sku,
    });

    toast.success(language === "es" 
      ? `${displayName} agregado al carrito`
      : `${displayName} added to cart`);
  };

  if (variant === "compact") {
    return (
      <Link href={`/store/products/${product.slug}`}>
        <Card className="group overflow-hidden hover:shadow-lg transition-shadow">
          <div className="relative aspect-square bg-muted">
            {primaryImage ? (
              <img
                src={primaryImage}
                alt={displayName}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-12 h-12 text-muted-foreground" />
              </div>
            )}
            {discount > 0 && (
              <Badge className="absolute top-2 left-2 bg-red-500">
                -{discount}%
              </Badge>
            )}
          </div>
          <CardContent className="p-3">
            <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
              {displayName}
            </h3>
            <div className="mt-1 flex items-center gap-2">
              <span className={`font-bold ${hasValidSale ? "text-green-600" : ""}`}>
                ${displayPrice.toFixed(2)}
              </span>
              {originalPrice && (
                <span className="text-sm text-muted-foreground line-through">
                  ${originalPrice.toFixed(2)}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <Link href={`/store/products/${product.slug}`}>
      <Card className={`group overflow-hidden hover:shadow-lg transition-all duration-300 h-full flex flex-col ${!inStock ? "opacity-70" : ""}`}>
        <div className="relative aspect-square bg-white overflow-hidden">
          {primaryImage ? (
            <img
              src={primaryImage}
              alt={displayName}
              className={`w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300 ${!inStock ? "grayscale" : ""}`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground/40" />
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 flex flex-col gap-1">
            {discount > 0 && (
              <Badge className="bg-red-500 hover:bg-red-600 text-[10px] sm:text-xs px-1.5 sm:px-2">
                -{discount}%
              </Badge>
            )}
            {product.isFeatured && (
              <Badge className="bg-primary text-[10px] sm:text-xs px-1.5 sm:px-2">{language === "es" ? "Destacado" : "Featured"}</Badge>
            )}
            {!inStock && (
              <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 sm:px-2">{t(translations.outOfStock)}</Badge>
            )}
          </div>

          {/* Quick Actions - visible on desktop hover */}
          <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="secondary"
              size="icon"
              className={`h-7 w-7 sm:h-8 sm:w-8 ${isInWishlist(product._id) ? "text-red-500" : ""}`}
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (status !== "authenticated") {
                  toast.error("Please sign in to add items to your wishlist");
                  return;
                }
                if (isInWishlist(product._id)) {
                  const success = await removeFromWishlist(product._id);
                  if (success) {
                    toast.success("Removed from wishlist");
                  }
                } else {
                  const success = await addToWishlist(product._id);
                  if (success) {
                    toast.success("Added to wishlist");
                  }
                }
              }}
            >
              <Heart className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isInWishlist(product._id) ? "fill-current" : ""}`} />
            </Button>
          </div>
        </div>

        <CardContent className="p-2.5 sm:p-4 flex-1 flex flex-col">
          <h3 className="font-semibold text-xs sm:text-sm line-clamp-2 group-hover:text-primary transition-colors mb-1 sm:mb-2 leading-tight">
            {displayName}
          </h3>

          <div className="mt-auto">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className={`text-base sm:text-lg font-bold ${hasValidSale ? "text-green-600" : ""}`}>
                ${displayPrice.toFixed(2)}
              </span>
              {originalPrice && (
                <span className="text-[10px] sm:text-sm text-muted-foreground line-through">
                  ${originalPrice.toFixed(2)}
                </span>
              )}
            </div>

            {/* Stock - compact on mobile */}
            <div className="mt-1">
              <span className={`text-[10px] sm:text-xs font-medium ${product.quantity > 10 ? "text-green-600" : product.quantity > 0 ? "text-yellow-600" : "text-red-500"}`}>
                {product.quantity > 0
                  ? (language === "es" ? "En stock" : "In stock")
                  : (language === "es" ? "Agotado" : "Out of stock")}
              </span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="p-2.5 sm:p-4 pt-0">
          <Button
            className="w-full h-8 sm:h-10 text-xs sm:text-sm"
            onClick={handleAddToCart}
            disabled={!inStock}
            variant={inCart ? "secondary" : "default"}
          >
            <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
            {inCart
              ? (language === "es" ? "En Carrito" : "In Cart")
              : inStock
                ? t(translations.addToCart)
                : t(translations.outOfStock)}
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
}
