"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "@/components/store/product-card";
import {
  Shield,
  Headphones,
  ArrowRight,
  ChevronRight,
  Flame,
  Star,
  Zap,
} from "lucide-react";
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

const defaultColors = [
  "bg-blue-500/10 text-blue-500",
  "bg-green-500/10 text-green-500",
  "bg-purple-500/10 text-purple-500",
  "bg-yellow-500/10 text-yellow-500",
  "bg-orange-500/10 text-orange-500",
  "bg-pink-500/10 text-pink-500",
  "bg-red-500/10 text-red-500",
  "bg-cyan-500/10 text-cyan-500",
];

export default function StorePage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [hotProducts, setHotProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { language } = useLanguage();

  // Translations
  const t = {
    professionalGrade: language === "es" ? "Suministros de Grado Profesional" : "Professional Grade Supplies",
    heroTitle1: language === "es" ? "Potencia Tus Proyectos con " : "Power Your Projects with ",
    heroTitle2: language === "es" ? "Suministros Eléctricos de Calidad" : "Quality Electrical Supplies",
    heroDescription: language === "es" 
      ? "Desde cableado hasta paneles, tenemos todo lo que necesitas para tus proyectos eléctricos. Productos de grado profesional a precios competitivos."
      : "From wiring to panels, we have everything you need for your electrical projects. Professional-grade products at competitive prices.",
    shopAllProducts: language === "es" ? "Ver Todos los Productos" : "Shop All Products",
    shopByCategory: language === "es" ? "Comprar por Categoría" : "Shop by Category",
    findWhatYouNeed: language === "es" ? "Encuentra exactamente lo que necesitas" : "Find exactly what you need",
    viewAll: language === "es" ? "Ver Todo" : "View All",
    hotProducts: language === "es" ? "Productos Populares" : "Hot Products",
    bestSellers: language === "es" ? "Los más vendidos esta semana" : "Best sellers this week",
    viewAllProducts: language === "es" ? "Ver Todos los Productos" : "View All Products",
    featuredProducts: language === "es" ? "Productos Destacados" : "Featured Products",
    handPicked: language === "es" ? "Seleccionados para ti" : "Hand-picked for you",
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
      <section className="relative bg-gradient-to-br from-primary/10 via-background to-background overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
                <Zap className="w-3 h-3 mr-1" />
                {t.professionalGrade}
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                {t.heroTitle1}
                <span className="text-primary">{language === "es" ? "Eléctricos " : "Quality Electrical"}</span> 
                {language === "es" ? "de Calidad" : " Supplies"}
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg">
                {t.heroDescription}
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/store/products">
                  <Button size="lg" className="gap-2">
                    {t.shopAllProducts}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
              
              {/* Mobile Logo */}
              <div className="lg:hidden flex justify-center mt-8">
                <div className="relative w-full max-w-[280px] aspect-square rounded-2xl overflow-hidden bg-white">
                  <Image
                    src="/logo.jpg"
                    alt="MultiElectric Supply"
                    fill
                    className="object-contain p-3"
                  />
                </div>
              </div>
            </div>
            
            {/* Desktop Logo */}
            <div className="relative hidden lg:flex items-center justify-center">
              <div className="relative w-full max-w-[500px] aspect-[4/3] rounded-3xl overflow-hidden bg-white">
                <Image
                  src="/logo.jpg"
                  alt="MultiElectric Supply"
                  fill
                  className="object-contain p-4"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold">{t.shopByCategory}</h2>
            <p className="text-muted-foreground">{t.findWhatYouNeed}</p>
          </div>
          <Link href="/store/categories">
            <Button variant="ghost" className="gap-1">
              {t.viewAll}
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
          {categories.length === 0 ? (
            <p className="col-span-full text-center text-muted-foreground py-8">
              {t.noCategories}
            </p>
          ) : (
            categories.map((category, index) => (
              <Link key={category._id} href={`/store/products?category=${category.slug}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                  <CardContent className="p-4 text-center">
                    <div className={`w-4 h-4 mx-auto rounded-full border-2 ${defaultColors[index % defaultColors.length].split(' ')[0].replace('/10', '')} border-current mb-3 group-hover:scale-110 transition-transform`} />
                    <p className="font-medium text-sm">{category.name}</p>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      </section>

      {/* Hot Products */}
      <section className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <Flame className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{t.hotProducts}</h2>
              <p className="text-muted-foreground">{t.bestSellers}</p>
            </div>
          </div>
          <Link href="/store/products">
            <Button className="gap-1">
              {t.viewAllProducts}
              <ArrowRight className="w-4 h-4" />
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
      </section>

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Star className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{t.featuredProducts}</h2>
                <p className="text-muted-foreground">{t.handPicked}</p>
              </div>
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
