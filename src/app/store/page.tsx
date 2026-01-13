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

interface Category {
  _id: string;
  name: string;
  slug: string;
  icon?: string;
  color?: string;
  isActive: boolean;
}

export default function StorePage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [hotProducts, setHotProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
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
    featuredProducts: language === "es" ? "Destacados" : "Featured",
    featuredDescription: language === "es" ? "Selección especial para ti" : "Hand-picked selection for you",
    noCategories: language === "es" ? "No hay categorías disponibles aún." : "No categories available yet.",
    noProducts: language === "es" ? "No hay productos disponibles aún. ¡Vuelve pronto!" : "No products available yet. Check back soon!",
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories?active=true");
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/products?status=active&limit=12");
      if (response.ok) {
        const data = await response.json();
        const products = data.products || [];
        
        // Split products into featured and hot
        const featured = products.filter((p: Product) => p.isFeatured).slice(0, 4);
        const hot = products.slice(0, 8);
        
        setFeaturedProducts(featured.length > 0 ? featured : products.slice(0, 4));
        setHotProducts(hot);
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
      <section className="border-b bg-gradient-to-b from-muted/50 to-background">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <p className="text-sm font-medium tracking-widest text-primary uppercase">
                  {t.heroTagline}
                </p>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight tracking-tight">
                  {t.heroTitle}
                </h1>
                <p className="text-lg text-muted-foreground max-w-md">
                  {t.heroDescription}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/store/products">
                  <Button size="lg">
                    {t.shopAllProducts}
                  </Button>
                </Link>
              </div>
            </div>
            
            {/* Logo/Image */}
            <div className="flex items-center justify-center">
              <div className="relative w-full max-w-[400px] aspect-square rounded-2xl overflow-hidden bg-white shadow-sm border">
                <Image
                  src="/logo.jpg"
                  alt="MultiElectric Supply"
                  fill
                  className="object-contain p-6"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container mx-auto px-4 py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{t.browseCategories}</h2>
            <p className="text-muted-foreground mt-1">{t.findByCategory}</p>
          </div>
        </div>
        
        {categories.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            {t.noCategories}
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {categories.map((category) => (
              <Link key={category._id} href={`/store/products?category=${category.slug}`}>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                  <CardContent className="p-5 text-center">
                    <p className="font-medium text-sm">{category.name}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
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

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="container mx-auto px-4 py-16">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">{t.featuredProducts}</h2>
              <p className="text-muted-foreground mt-1">{t.featuredDescription}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
