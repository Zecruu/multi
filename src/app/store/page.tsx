"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "@/components/store/product-card";
import { useLanguage } from "@/lib/language-context";

interface Product {
  _id: string;
  name: string;
  slug: string;
  sku: string;
  price: number;
  compareAtPrice?: number;
  images: { url: string; key: string; isPrimary: boolean }[];
  category: string;
  quantity: number;
  status: string;
  isFeatured?: boolean;
}

export default function StorePage() {
  const [hotProducts, setHotProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { language } = useLanguage();

  // Translations
  const t = {
    heroTagline: language === "es" ? "Suministros Eléctricos Profesionales" : "Professional Electrical Supplies",
    heroTitle: language === "es" ? "Todo lo que necesitas para tus proyectos eléctricos" : "Everything you need for your electrical projects",
    heroDescription: language === "es" 
      ? "Cableado, paneles, herramientas y más. Productos de calidad profesional a precios competitivos."
      : "Wiring, panels, tools, and more. Professional-quality products at competitive prices.",
    shopAllProducts: language === "es" ? "Ver Productos" : "Browse Products",
    browseCategories: language === "es" ? "Categorías" : "Categories",
    findByCategory: language === "es" ? "Explora nuestra selección por categoría" : "Explore our selection by category",
    viewAll: language === "es" ? "Ver todo" : "View all",
    popularProducts: language === "es" ? "Productos Populares" : "Popular Products",
    popularDescription: language === "es" ? "Los más vendidos esta semana" : "Best sellers this week",
    viewAllProducts: language === "es" ? "Ver Todos" : "View All",
    noCategories: language === "es" ? "No hay categorías disponibles aún." : "No categories available yet.",
    noProducts: language === "es" ? "No hay productos disponibles aún. ¡Vuelve pronto!" : "No products available yet. Check back soon!",
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/products?status=active&limit=50&inStockFirst=true");
      if (response.ok) {
        const data = await response.json();
        const products = data.products || [];

        // Only show products that have working images (CloudFront URLs)
        const withImages = products.filter((p: Product) =>
          p.images?.length > 0 && p.images[0]?.url?.startsWith("https://")
        );

        setHotProducts(withImages.slice(0, 8));
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative border-b overflow-hidden bg-white">
        {/* Desktop image (hidden below md) */}
        <div className="hidden md:block relative w-full aspect-[1717/916]">
          <Image
            src="/hero-desktop.png"
            alt="Multi Electric Supply — Impulsamos tus proyectos. Entregamos soluciones."
            fill
            className="object-cover object-center"
            priority
            sizes="100vw"
          />
        </div>

        {/* Mobile image (hidden at md+) */}
        <div className="md:hidden relative w-full aspect-[1086/1448]">
          <Image
            src="/hero-mobile.png"
            alt="Multi Electric Supply — Impulsamos tus proyectos. Entregamos soluciones."
            fill
            className="object-cover object-center"
            priority
            sizes="100vw"
          />
        </div>

        {/* CTA below hero */}
        <div className="container mx-auto px-4 py-6 md:py-8 flex justify-center">
          <Link href="/store/products">
            <Button size="lg" className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-8 py-6 text-base md:text-lg shadow-lg">
              {t.shopAllProducts}
            </Button>
          </Link>
        </div>
      </section>

      {/* Popular Products */}
      <section className="bg-muted/30 border-y">
        <div className="container mx-auto px-4 py-16">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">{t.popularProducts}</h2>
              <p className="text-muted-foreground mt-1">{t.popularDescription}</p>
            </div>
            <Link href="/store/products">
              <Button variant="outline">
                {t.viewAllProducts}
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="aspect-square" />
                  <CardContent className="p-4 space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-16" />
                  </CardContent>
                  <div className="p-4 pt-0">
                    <Skeleton className="h-10 w-full" />
                  </div>
                </Card>
              ))}
            </div>
          ) : hotProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {hotProducts.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">{t.noProducts}</p>
            </Card>
          )}
        </div>
      </section>

    </div>
  );
}
