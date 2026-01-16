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
      {/* Spark Animation Styles */}
      <style jsx>{`
        @keyframes spark-flicker {
          0%, 100% { opacity: 0; }
          5% { opacity: 1; }
          10% { opacity: 0.3; }
          15% { opacity: 1; }
          20% { opacity: 0; }
          45% { opacity: 0; }
          50% { opacity: 0.8; }
          55% { opacity: 0; }
          80% { opacity: 0; }
          85% { opacity: 1; }
          90% { opacity: 0.5; }
          95% { opacity: 1; }
        }
        @keyframes spark-flicker-2 {
          0%, 100% { opacity: 0; }
          10% { opacity: 0; }
          15% { opacity: 1; }
          20% { opacity: 0.2; }
          25% { opacity: 0.9; }
          30% { opacity: 0; }
          60% { opacity: 0; }
          65% { opacity: 1; }
          70% { opacity: 0; }
        }
        @keyframes spark-flicker-3 {
          0%, 100% { opacity: 0; }
          30% { opacity: 0; }
          35% { opacity: 1; }
          40% { opacity: 0; }
          42% { opacity: 0.7; }
          45% { opacity: 0; }
          70% { opacity: 0; }
          75% { opacity: 1; }
          78% { opacity: 0.4; }
          80% { opacity: 1; }
          85% { opacity: 0; }
        }
        .spark { animation: spark-flicker 2s infinite; }
        .spark-2 { animation: spark-flicker-2 2.5s infinite; }
        .spark-3 { animation: spark-flicker-3 3s infinite; }
      `}</style>

      {/* Hero Section */}
      <section className="relative border-b overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="/4d1a808c-3013-4f75-acd5-00ddf39cc3f7.jpg"
            alt="Electrical supplies background"
            fill
            className="object-cover"
            priority
          />
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-black/60" />
        </div>

        {/* Electrical Sparks - Left Side */}
        <div className="absolute left-0 top-0 bottom-0 w-16 md:w-24 pointer-events-none z-10">
          {/* Spark 1 */}
          <svg className="spark absolute top-[15%] -left-2" width="60" height="80" viewBox="0 0 60 80">
            <path d="M30 0 L35 25 L50 20 L25 45 L35 42 L10 80 L20 45 L5 50 L25 20 L15 25 Z"
              fill="url(#sparkGradient)" filter="url(#glow)" />
            <defs>
              <linearGradient id="sparkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fff" />
                <stop offset="50%" stopColor="#fef08a" />
                <stop offset="100%" stopColor="#facc15" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
          </svg>
          {/* Spark 2 */}
          <svg className="spark-2 absolute top-[45%] left-1" width="50" height="70" viewBox="0 0 50 70">
            <path d="M25 0 L30 20 L45 15 L20 40 L30 37 L5 70 L15 40 L0 45 L20 15 L10 20 Z"
              fill="#fef9c3" filter="url(#glow2)" />
            <defs>
              <filter id="glow2">
                <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
          </svg>
          {/* Spark 3 */}
          <svg className="spark-3 absolute top-[75%] -left-1" width="45" height="60" viewBox="0 0 45 60">
            <path d="M20 0 L25 18 L40 14 L18 35 L26 33 L5 60 L12 35 L0 38 L18 14 L10 17 Z"
              fill="#fde047" filter="url(#glow3)" />
            <defs>
              <filter id="glow3">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
          </svg>
        </div>

        {/* Electrical Sparks - Right Side */}
        <div className="absolute right-0 top-0 bottom-0 w-16 md:w-24 pointer-events-none z-10">
          {/* Spark 4 */}
          <svg className="spark-2 absolute top-[20%] -right-2 rotate-180" width="55" height="75" viewBox="0 0 55 75">
            <path d="M28 0 L33 22 L48 18 L23 42 L32 39 L8 75 L17 42 L3 46 L23 18 L13 22 Z"
              fill="#fef08a" filter="url(#glow4)" />
            <defs>
              <filter id="glow4">
                <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
                <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
          </svg>
          {/* Spark 5 */}
          <svg className="spark absolute top-[55%] right-0 rotate-180" width="50" height="65" viewBox="0 0 50 65">
            <path d="M25 0 L29 19 L44 15 L21 38 L29 35 L6 65 L14 38 L1 42 L21 15 L12 19 Z"
              fill="#fff" filter="url(#glow5)" />
            <defs>
              <filter id="glow5">
                <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
          </svg>
          {/* Spark 6 */}
          <svg className="spark-3 absolute top-[80%] -right-1 rotate-180" width="48" height="62" viewBox="0 0 48 62">
            <path d="M24 0 L28 17 L42 14 L20 36 L28 33 L6 62 L13 36 L1 39 L20 14 L11 17 Z"
              fill="#facc15" filter="url(#glow6)" />
            <defs>
              <filter id="glow6">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
          </svg>
        </div>

        {/* Electric arc lines on edges */}
        <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-transparent via-yellow-400/50 to-transparent spark opacity-70" />
        <div className="absolute inset-y-0 right-0 w-1 bg-gradient-to-b from-transparent via-yellow-400/50 to-transparent spark-2 opacity-70" />

        {/* Content */}
        <div className="relative container mx-auto px-4 py-16 md:py-20 lg:py-24 z-20">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            {/* Tagline */}
            <p className="text-sm md:text-base font-medium tracking-widest text-yellow-400 uppercase">
              {t.heroTagline}
            </p>

            {/* Main Title */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight text-white drop-shadow-lg">
              {t.heroTitle}
            </h1>

            {/* Description */}
            <p className="text-lg md:text-xl text-gray-200 max-w-2xl mx-auto">
              {t.heroDescription}
            </p>

            {/* Button */}
            <div className="pt-4">
              <Link href="/store/products">
                <Button size="lg" className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-8 py-6 text-lg">
                  {t.shopAllProducts}
                </Button>
              </Link>
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
