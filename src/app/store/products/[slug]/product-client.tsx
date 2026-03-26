"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCart } from "@/lib/cart-context";
import { toast } from "sonner";
import {
  ShoppingCart,
  Heart,
  Share2,
  Minus,
  Plus,
  ChevronRight,
  Package,
  Check,
} from "lucide-react";
import { useLanguage, translations } from "@/lib/language-context";

interface Product {
  _id: string;
  name: string;
  nameEs?: string;
  slug: string;
  sku: string;
  description: string;
  descriptionEs?: string;
  shortDescription?: string;
  shortDescriptionEs?: string;
  price: number;
  compareAtPrice?: number;
  isOnSale?: boolean;
  salePrice?: number;
  images: { url: string; key: string; isPrimary: boolean }[];
  category: string;
  brand?: string;
  quantity: number;
  status: string;
  unit: string;
  specifications?: Record<string, string>;
  isFeatured?: boolean;
}

interface ProductClientProps {
  initialProduct: Product | null;
  slug: string;
}

export default function ProductClient({ initialProduct, slug }: ProductClientProps) {
  const [product, setProduct] = useState<Product | null>(initialProduct);
  const [isLoading, setIsLoading] = useState(!initialProduct);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const { addItem, isInCart } = useCart();
  const { language, t } = useLanguage();

  // Helper to get localized content
  const getLocalizedName = (p: Product) => {
    if (language === "es" && p.nameEs) return p.nameEs;
    return p.name;
  };

  const getLocalizedDescription = (p: Product) => {
    if (language === "es" && p.descriptionEs) return p.descriptionEs;
    return p.description;
  };

  const getLocalizedShortDescription = (p: Product) => {
    if (language === "es" && p.shortDescriptionEs) return p.shortDescriptionEs;
    return p.shortDescription;
  };

  useEffect(() => {
    if (!initialProduct && slug) {
      fetchProduct();
    }
  }, [slug, initialProduct]);

  const fetchProduct = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/products/slug/${slug}`);
      if (response.ok) {
        const data = await response.json();
        setProduct(data);
      }
    } catch (error) {
      console.error("Failed to fetch product:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;

    if (product.quantity <= 0) {
      toast.error("This product is out of stock");
      return;
    }

    const primaryImage = product.images?.find((img) => img.isPrimary)?.url || product.images?.[0]?.url;
    const hasValidSale = product.isOnSale && product.salePrice && product.salePrice < product.price;
    const displayPrice = hasValidSale ? product.salePrice! : product.price;

    addItem({
      productId: product._id,
      name: product.name,
      price: displayPrice,
      image: primaryImage,
      sku: product.sku,
      quantity,
    });

    toast.success(language === "es" 
      ? `${getLocalizedName(product)} agregado al carrito`
      : `${getLocalizedName(product)} added to cart`);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <Skeleton className="aspect-square rounded-lg" />
            <div className="flex gap-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="w-20 h-20 rounded-lg" />
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
        <p className="text-muted-foreground mb-6">
          The product you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <Link href="/store/products">
          <Button>Browse Products</Button>
        </Link>
      </div>
    );
  }

  const primaryImage = product.images?.find((img) => img.isPrimary)?.url || product.images?.[0]?.url;
  
  // Calculate display price and discount
  const hasValidSale = product.isOnSale && product.salePrice && product.salePrice < product.price;
  const displayPrice = hasValidSale ? product.salePrice! : product.price;
  const originalPrice = hasValidSale ? product.price : (product.compareAtPrice && product.compareAtPrice > product.price ? product.compareAtPrice : undefined);
  const discount = originalPrice && originalPrice > displayPrice
    ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100)
    : 0;
    
  const inStock = product.quantity > 0;
  const inCart = isInCart(product._id);

  return (
    <div className="container mx-auto px-4 py-4 lg:py-8 pb-28 lg:pb-8">
      {/* Breadcrumb - hidden on mobile, compact */}
      <nav className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground mb-6 overflow-x-auto whitespace-nowrap">
        <Link href="/store" className="hover:text-foreground">
          {t(translations.home)}
        </Link>
        <ChevronRight className="w-4 h-4 shrink-0" />
        <Link href="/store/products" className="hover:text-foreground">
          {t(translations.products)}
        </Link>
        <ChevronRight className="w-4 h-4 shrink-0" />
        <Link
          href={`/store/products?category=${product.category.toLowerCase()}`}
          className="hover:text-foreground"
        >
          {product.category}
        </Link>
        <ChevronRight className="w-4 h-4 shrink-0" />
        <span className="text-foreground truncate">{getLocalizedName(product)}</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-6 lg:gap-12">
        {/* Product Images - full width on mobile, swipeable */}
        <div className="space-y-3">
          <div className="relative aspect-square rounded-lg bg-muted overflow-hidden -mx-4 sm:mx-0 sm:rounded-lg">
            {product.images && product.images.length > 0 ? (
              <img
                src={product.images[selectedImage]?.url || primaryImage}
                alt={product.name}
                className="w-full h-full object-contain bg-white"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-white">
                <Package className="w-20 h-20 text-muted-foreground/40" />
              </div>
            )}
            {discount > 0 && (
              <Badge className="absolute top-3 left-3 sm:top-4 sm:left-4 bg-red-500 text-sm sm:text-lg px-2 sm:px-3 py-0.5 sm:py-1">
                -{discount}%
              </Badge>
            )}
            {/* Image counter on mobile */}
            {product.images && product.images.length > 1 && (
              <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full sm:hidden">
                {selectedImage + 1}/{product.images.length}
              </div>
            )}
          </div>

          {/* Thumbnail Gallery - horizontal scroll on mobile */}
          {product.images && product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0">
              {product.images.map((image, index) => (
                <button
                  key={image.key}
                  onClick={() => setSelectedImage(index)}
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 shrink-0 snap-start ${
                    selectedImage === index
                      ? "border-primary"
                      : "border-transparent hover:border-muted-foreground/50"
                  }`}
                >
                  <img
                    src={image.url}
                    alt={`${product.name} ${index + 1}`}
                    className="w-full h-full object-contain bg-white"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-4 lg:space-y-6">
          {/* Brand & Title */}
          <div>
            {product.brand && (
              <Link
                href={`/store/products?category=${product.category.toLowerCase()}`}
                className="text-sm text-primary hover:underline"
              >
                {product.brand}
              </Link>
            )}
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold leading-tight">{getLocalizedName(product)}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">{t(translations.sku)}: {product.sku}</p>
          </div>

          {/* Price - prominent like Amazon */}
          <div className="bg-muted/30 rounded-lg p-3 sm:p-4 -mx-1 sm:mx-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              {originalPrice && (
                <span className="text-sm text-muted-foreground">
                  {language === "es" ? "Antes" : "Was"}: <span className="line-through">${originalPrice.toFixed(2)}</span>
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-sm text-muted-foreground">
                {language === "es" ? "Precio" : "Price"}:
              </span>
              <span className={`text-2xl sm:text-3xl font-bold ${hasValidSale ? "text-green-600" : ""}`}>
                ${displayPrice.toFixed(2)}
              </span>
              {discount > 0 && (
                <Badge variant="destructive" className="text-xs sm:text-sm">
                  {language === "es" ? `Ahorra ${discount}%` : `Save ${discount}%`}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              /{product.unit}
            </p>
          </div>

          {/* Stock Status */}
          <div className="flex items-center gap-2">
            {inStock ? (
              <>
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600 font-medium">{t(translations.inStock)}</span>
                <span className="text-sm text-muted-foreground">
                  ({product.quantity} {language === "es" ? "disponibles" : "available"})
                </span>
              </>
            ) : (
              <Badge variant="secondary" className="text-sm">{t(translations.outOfStock)}</Badge>
            )}
          </div>

          {/* Short Description */}
          {(product.shortDescription || product.shortDescriptionEs) && (
            <p className="text-sm text-muted-foreground leading-relaxed">{getLocalizedShortDescription(product)}</p>
          )}

          <Separator />

          {/* Quantity & Add to Cart - desktop only, mobile has sticky bar */}
          <div className="hidden lg:block space-y-4">
            <div className="flex items-center gap-4">
              <span className="font-medium">{t(translations.quantity)}:</span>
              <div className="flex items-center border rounded-md">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={!inStock}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center">{quantity}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setQuantity(Math.min(product.quantity, quantity + 1))}
                  disabled={!inStock || quantity >= product.quantity}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                size="lg"
                className="flex-1"
                onClick={handleAddToCart}
                disabled={!inStock}
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                {inCart
                  ? (language === "es" ? "Agregar Más" : "Add More to Cart")
                  : t(translations.addToCart)}
              </Button>
              <Button size="lg" variant="outline">
                <Heart className="w-5 h-5" />
              </Button>
              <Button size="lg" variant="outline">
                <Share2 className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <Separator className="hidden lg:block" />

        </div>
      </div>

      {/* Product Details - Accordion style on mobile, tabs on desktop */}
      <div className="mt-8 lg:mt-12">
        <Tabs defaultValue="description">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="description" className="text-sm">{t(translations.description)}</TabsTrigger>
            <TabsTrigger value="specifications" className="text-sm">{t(translations.specifications)}</TabsTrigger>
          </TabsList>
          <TabsContent value="description" className="mt-4 lg:mt-6">
            <Card>
              <CardContent className="p-4 sm:p-6 prose prose-sm max-w-none dark:prose-invert">
                <p>{getLocalizedDescription(product)}</p>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="specifications" className="mt-4 lg:mt-6">
            <Card>
              <CardContent className="p-4 sm:p-6">
                <dl className="grid grid-cols-1 gap-0">
                  <div className="flex justify-between py-3 border-b">
                    <dt className="text-sm text-muted-foreground">SKU</dt>
                    <dd className="text-sm font-medium">{product.sku}</dd>
                  </div>
                  <div className="flex justify-between py-3 border-b">
                    <dt className="text-sm text-muted-foreground">{language === "es" ? "Categoría" : "Category"}</dt>
                    <dd className="text-sm font-medium">{product.category}</dd>
                  </div>
                  {product.brand && (
                    <div className="flex justify-between py-3 border-b">
                      <dt className="text-sm text-muted-foreground">{language === "es" ? "Marca" : "Brand"}</dt>
                      <dd className="text-sm font-medium">{product.brand}</dd>
                    </div>
                  )}
                  <div className="flex justify-between py-3 border-b">
                    <dt className="text-sm text-muted-foreground">{language === "es" ? "Unidad" : "Unit"}</dt>
                    <dd className="text-sm font-medium capitalize">{product.unit}</dd>
                  </div>
                  {product.specifications &&
                    Object.entries(product.specifications).map(([key, value]) => (
                      <div key={key} className="flex justify-between py-3 border-b">
                        <dt className="text-sm text-muted-foreground capitalize">{key}</dt>
                        <dd className="text-sm font-medium">{value}</dd>
                      </div>
                    ))}
                </dl>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Sticky Mobile Add to Cart Bar - Amazon style */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t p-3 flex items-center gap-3 lg:hidden z-50">
        <div className="flex items-center border rounded-md shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={!inStock}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="w-8 text-center text-sm font-medium">{quantity}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setQuantity(Math.min(product.quantity, quantity + 1))}
            disabled={!inStock || quantity >= product.quantity}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        <Button
          className="flex-1 h-11"
          onClick={handleAddToCart}
          disabled={!inStock}
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          {inCart
            ? (language === "es" ? "Agregar Más" : "Add More")
            : t(translations.addToCart)}
          <span className="ml-2 font-bold">${(displayPrice * quantity).toFixed(2)}</span>
        </Button>
      </div>
    </div>
  );
}
