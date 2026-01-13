"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
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
  Truck,
  Shield,
  RotateCcw,
  Minus,
  Plus,
  Star,
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

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
    if (slug) {
      fetchProduct();
    }
  }, [slug]);

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
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/store" className="hover:text-foreground">
          {t(translations.home)}
        </Link>
        <ChevronRight className="w-4 h-4" />
        <Link href="/store/products" className="hover:text-foreground">
          {t(translations.products)}
        </Link>
        <ChevronRight className="w-4 h-4" />
        <Link
          href={`/store/products?category=${product.category.toLowerCase()}`}
          className="hover:text-foreground"
        >
          {product.category}
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-foreground">{getLocalizedName(product)}</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Product Images */}
        <div className="space-y-4">
          <div className="relative aspect-square rounded-lg bg-muted overflow-hidden">
            {product.images && product.images.length > 0 ? (
              <img
                src={product.images[selectedImage]?.url || primaryImage}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-24 h-24 text-muted-foreground" />
              </div>
            )}
            {discount > 0 && (
              <Badge className="absolute top-4 left-4 bg-red-500 text-lg px-3 py-1">
                -{discount}%
              </Badge>
            )}
          </div>

          {/* Thumbnail Gallery */}
          {product.images && product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {product.images.map((image, index) => (
                <button
                  key={image.key}
                  onClick={() => setSelectedImage(index)}
                  className={`w-20 h-20 rounded-lg overflow-hidden border-2 shrink-0 ${
                    selectedImage === index
                      ? "border-primary"
                      : "border-transparent hover:border-muted-foreground/50"
                  }`}
                >
                  <img
                    src={image.url}
                    alt={`${product.name} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          {/* Title & Brand */}
          <div>
            {product.brand && (
              <p className="text-sm text-muted-foreground mb-1">{product.brand}</p>
            )}
            <h1 className="text-2xl lg:text-3xl font-bold">{getLocalizedName(product)}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t(translations.sku)}: {product.sku}</p>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < 4 ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">(24 reviews)</span>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className={`text-3xl font-bold ${hasValidSale ? "text-green-600" : ""}`}>
              ${displayPrice.toFixed(2)}
            </span>
            {originalPrice && (
              <span className="text-xl text-muted-foreground line-through">
                ${originalPrice.toFixed(2)}
              </span>
            )}
            {discount > 0 && (
              <Badge variant="destructive">Save {discount}%</Badge>
            )}
          </div>

          {/* Stock Status */}
          <div className="flex items-center gap-2">
            {inStock ? (
              <>
                <Check className="w-5 h-5 text-green-500" />
                <span className="text-green-500 font-medium">{t(translations.inStock)}</span>
                <span className="text-muted-foreground">
                  ({product.quantity} {language === "es" ? "disponibles" : "available"})
                </span>
              </>
            ) : (
              <Badge variant="secondary">{t(translations.outOfStock)}</Badge>
            )}
          </div>

          {/* Short Description */}
          {(product.shortDescription || product.shortDescriptionEs) && (
            <p className="text-muted-foreground">{getLocalizedShortDescription(product)}</p>
          )}

          <Separator />

          {/* Quantity & Add to Cart */}
          <div className="space-y-4">
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
              <span className="text-sm text-muted-foreground">
                {product.unit}
              </span>
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

          <Separator />

          {/* Features */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <Truck className="w-6 h-6 mx-auto mb-2 text-primary" />
              <p className="text-xs font-medium">Free Shipping</p>
              <p className="text-xs text-muted-foreground">Orders $99+</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <Shield className="w-6 h-6 mx-auto mb-2 text-primary" />
              <p className="text-xs font-medium">Warranty</p>
              <p className="text-xs text-muted-foreground">1 Year</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <RotateCcw className="w-6 h-6 mx-auto mb-2 text-primary" />
              <p className="text-xs font-medium">Easy Returns</p>
              <p className="text-xs text-muted-foreground">30 Days</p>
            </div>
          </div>
        </div>
      </div>

      {/* Product Details Tabs */}
      <div className="mt-12">
        <Tabs defaultValue="description">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="description">{t(translations.description)}</TabsTrigger>
            <TabsTrigger value="specifications">{t(translations.specifications)}</TabsTrigger>
            <TabsTrigger value="reviews">Reviews (24)</TabsTrigger>
          </TabsList>
          <TabsContent value="description" className="mt-6">
            <Card>
              <CardContent className="p-6 prose prose-sm max-w-none dark:prose-invert">
                <p>{getLocalizedDescription(product)}</p>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="specifications" className="mt-6">
            <Card>
              <CardContent className="p-6">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex justify-between py-2 border-b">
                    <dt className="text-muted-foreground">SKU</dt>
                    <dd className="font-medium">{product.sku}</dd>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <dt className="text-muted-foreground">Category</dt>
                    <dd className="font-medium">{product.category}</dd>
                  </div>
                  {product.brand && (
                    <div className="flex justify-between py-2 border-b">
                      <dt className="text-muted-foreground">Brand</dt>
                      <dd className="font-medium">{product.brand}</dd>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-b">
                    <dt className="text-muted-foreground">Unit</dt>
                    <dd className="font-medium capitalize">{product.unit}</dd>
                  </div>
                  {product.specifications &&
                    Object.entries(product.specifications).map(([key, value]) => (
                      <div key={key} className="flex justify-between py-2 border-b">
                        <dt className="text-muted-foreground capitalize">{key}</dt>
                        <dd className="font-medium">{value}</dd>
                      </div>
                    ))}
                </dl>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="reviews" className="mt-6">
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                <p>Reviews coming soon!</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
