"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWishlist } from "@/lib/wishlist-context";
import { useCart } from "@/lib/cart-context";
import { Heart, ShoppingCart, Trash2, Package, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function WishlistPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { items, isLoading, removeFromWishlist } = useWishlist();
  const { addItem, isInCart } = useCart();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/store/login?callbackUrl=/store/wishlist");
    }
  }, [status, router]);

  if (status === "loading" || isLoading) {
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

  const handleAddToCart = (item: typeof items[0]) => {
    const product = item.productId;
    if (!product || product.quantity <= 0) {
      toast.error("This product is out of stock");
      return;
    }

    const primaryImage = product.images?.find((img) => img.isPrimary)?.url || product.images?.[0]?.url;

    addItem({
      productId: product._id,
      name: product.name,
      price: product.price,
      image: primaryImage,
      sku: product.sku,
    });

    toast.success(`${product.name} added to cart`);
  };

  const handleRemove = async (productId: string) => {
    const success = await removeFromWishlist(productId);
    if (success) {
      toast.success("Removed from wishlist");
    } else {
      toast.error("Failed to remove from wishlist");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/store">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Heart className="h-8 w-8 text-red-500" />
            My Wishlist
          </h1>
          <p className="text-muted-foreground">
            {items.length} {items.length === 1 ? "item" : "items"} saved
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <Card className="p-12 text-center">
          <Heart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Your wishlist is empty</h2>
          <p className="text-muted-foreground mb-6">
            Save items you love by clicking the heart icon on any product.
          </p>
          <Link href="/store/products">
            <Button>Browse Products</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((item) => {
            const product = item.productId;
            if (!product) return null;

            const primaryImage = product.images?.find((img) => img.isPrimary)?.url || product.images?.[0]?.url;
            const inStock = product.quantity > 0;
            const inCart = isInCart(product._id);
            const discount = product.compareAtPrice
              ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
              : 0;

            return (
              <Card key={product._id} className="overflow-hidden group">
                <Link href={`/store/products/${product.slug}`}>
                  <div className="relative aspect-square bg-muted">
                    {primaryImage ? (
                      <img
                        src={primaryImage}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-16 h-16 text-muted-foreground" />
                      </div>
                    )}
                    {discount > 0 && (
                      <Badge className="absolute top-2 left-2 bg-red-500">
                        -{discount}%
                      </Badge>
                    )}
                    {!inStock && (
                      <Badge variant="secondary" className="absolute top-2 right-2">
                        Out of Stock
                      </Badge>
                    )}
                  </div>
                </Link>

                <CardContent className="p-4">
                  <Badge variant="outline" className="mb-2 text-xs">
                    {product.category}
                  </Badge>

                  <Link href={`/store/products/${product.slug}`}>
                    <h3 className="font-semibold line-clamp-2 hover:text-primary transition-colors mb-2">
                      {product.name}
                    </h3>
                  </Link>

                  <p className="text-xs text-muted-foreground mb-2">SKU: {product.sku}</p>

                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-lg font-bold">${product.price.toFixed(2)}</span>
                    {product.compareAtPrice && (
                      <span className="text-sm text-muted-foreground line-through">
                        ${product.compareAtPrice.toFixed(2)}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => handleAddToCart(item)}
                      disabled={!inStock}
                      variant={inCart ? "secondary" : "default"}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      {inCart ? "In Cart" : "Add to Cart"}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleRemove(product._id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
