"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ProductCard } from "@/components/store/product-card";
import {
  Search,
  SlidersHorizontal,
  Grid3X3,
  LayoutList,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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
  categories?: string[];
  quantity: number;
  status: string;
  isFeatured?: boolean;
}

function ProductsContent() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  const { language } = useLanguage();

  const t = {
    allProducts: language === "es" ? "Todos los Productos" : "All Products",
    browseSelection: language === "es" ? "Explora nuestra selección completa de suministros eléctricos" : "Browse our complete selection of electrical supplies",
    searchProducts: language === "es" ? "Buscar productos..." : "Search products...",
    filters: language === "es" ? "Filtros" : "Filters",
    sortBy: language === "es" ? "Ordenar por" : "Sort by",
    priceRange: language === "es" ? "Rango de Precio" : "Price Range",
    availability: language === "es" ? "Disponibilidad" : "Availability",
    inStockOnly: language === "es" ? "Solo en Stock" : "In Stock Only",
    clearFilters: language === "es" ? "Limpiar Filtros" : "Clear Filters",
    noProducts: language === "es" ? "No se encontraron productos con tus criterios." : "No products found matching your criteria.",
    showing: language === "es" ? "Mostrando" : "Showing",
    products: language === "es" ? "productos" : "products",
  };

  const priceRanges = [
    { label: language === "es" ? "Menos de $25" : "Under $25", min: 0, max: 25 },
    { label: "$25 - $50", min: 25, max: 50 },
    { label: "$50 - $100", min: 50, max: 100 },
    { label: "$100 - $250", min: 100, max: 250 },
    { label: language === "es" ? "Más de $250" : "Over $250", min: 250, max: Infinity },
  ];

  const sortOptions = [
    { value: "featured", label: language === "es" ? "Destacados" : "Featured" },
    { value: "newest", label: language === "es" ? "Más Recientes" : "Newest" },
    { value: "price-asc", label: language === "es" ? "Precio: Menor a Mayor" : "Price: Low to High" },
    { value: "price-desc", label: language === "es" ? "Precio: Mayor a Menor" : "Price: High to Low" },
    { value: "name-asc", label: language === "es" ? "Nombre: A-Z" : "Name: A to Z" },
    { value: "name-desc", label: language === "es" ? "Nombre: Z-A" : "Name: Z to A" },
  ];

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("featured");
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedPriceRanges, setSelectedPriceRanges] = useState<number[]>([]);
  const [inStockOnly, setInStockOnly] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const productsPerPage = 24; // Show 24 products per page (8 rows of 3)

  useEffect(() => {
    fetchProducts(1);
  }, []);

  const fetchProducts = async (page = 1) => {
    try {
      setIsLoading(true);
      // Only show active products that are in stock (quantity > 0)
      const response = await fetch(`/api/products?status=active&inStockFirst=true&page=${page}&limit=${productsPerPage}`);
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
        setTotalProducts(data.pagination?.total || 0);
        setTotalPages(data.pagination?.pages || 1);
        setCurrentPage(data.pagination?.page || 1);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter and sort products
  const filteredProducts = products
    .filter((product) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !product.name.toLowerCase().includes(query) &&
          !product.sku.toLowerCase().includes(query) &&
          !product.category.toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      // Price filter (multi-select)
      if (selectedPriceRanges.length > 0) {
        const matchesAnyRange = selectedPriceRanges.some((rangeIndex) => {
          const range = priceRanges[rangeIndex];
          return product.price >= range.min && product.price <= range.max;
        });
        if (!matchesAnyRange) {
          return false;
        }
      }

      // Stock filter
      if (inStockOnly && product.quantity <= 0) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      // Always push out-of-stock to the bottom
      const aOut = a.quantity <= 0 ? 1 : 0;
      const bOut = b.quantity <= 0 ? 1 : 0;
      if (aOut !== bOut) return aOut - bOut;
      switch (sortBy) {
        case "price-asc":
          return a.price - b.price;
        case "price-desc":
          return b.price - a.price;
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "newest":
          return 0; // Would need createdAt field
        default:
          return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
      }
    });

  const togglePriceRange = (index: number) => {
    setSelectedPriceRanges((prev) =>
      prev.includes(index)
        ? prev.filter((i) => i !== index)
        : [...prev, index]
    );
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedPriceRanges([]);
    setInStockOnly(false);
  };

  const hasActiveFilters =
    searchQuery ||
    selectedPriceRanges.length > 0 ||
    inStockOnly;

  const FilterSidebar = () => (
    <div className="space-y-6">
      {/* Price Range */}
      <div>
        <h3 className="font-semibold mb-3">{t.priceRange}</h3>
        <div className="space-y-2">
          {priceRanges.map((range, index) => (
            <div key={range.label} className="flex items-center space-x-2">
              <Checkbox
                id={`price-${index}`}
                checked={selectedPriceRanges.includes(index)}
                onCheckedChange={() => togglePriceRange(index)}
              />
              <Label
                htmlFor={`price-${index}`}
                className="text-sm cursor-pointer"
              >
                {range.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Availability */}
      <div>
        <h3 className="font-semibold mb-3">{t.availability}</h3>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="in-stock"
            checked={inStockOnly}
            onCheckedChange={(checked) => setInStockOnly(checked as boolean)}
          />
          <Label htmlFor="in-stock" className="text-sm cursor-pointer">
            {t.inStockOnly}
          </Label>
        </div>
      </div>

      {hasActiveFilters && (
        <>
          <Separator />
          <Button variant="outline" className="w-full" onClick={clearFilters}>
            {t.clearFilters}
          </Button>
        </>
      )}
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t.allProducts}</h1>
        <p className="text-muted-foreground">
          {t.browseSelection}
        </p>
      </div>

      <div className="flex gap-8">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 shrink-0">
          <Card className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-hidden flex flex-col">
            <CardContent className="p-6 overflow-y-auto">
              <FilterSidebar />
            </CardContent>
          </Card>
        </aside>

        {/* Main Content */}
        <div className="flex-1">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t.searchProducts}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-2">
              {/* Mobile Filter */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="lg:hidden">
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    {t.filters}
                    {hasActiveFilters && (
                      <Badge className="ml-2" variant="secondary">
                        {selectedPriceRanges.length + (inStockOnly ? 1 : 0)}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80">
                  <SheetHeader>
                    <SheetTitle>{t.filters}</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <FilterSidebar />
                  </div>
                </SheetContent>
              </Sheet>

              {/* Sort */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t.sortBy} />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* View Mode */}
              <div className="hidden sm:flex border rounded-md">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("list")}
                >
                  <LayoutList className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Active Filters */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 mb-6">
              {searchQuery && (
                <Badge variant="secondary" className="gap-1">
                  {language === "es" ? "Búsqueda" : "Search"}: {searchQuery}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setSearchQuery("")}
                  />
                </Badge>
              )}
              {selectedPriceRanges.map((rangeIndex) => (
                <Badge key={rangeIndex} variant="secondary" className="gap-1">
                  {priceRanges[rangeIndex].label}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => togglePriceRange(rangeIndex)}
                  />
                </Badge>
              ))}
              {inStockOnly && (
                <Badge variant="secondary" className="gap-1">
                  {t.inStockOnly}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setInStockOnly(false)}
                  />
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={clearFilters}
              >
                {language === "es" ? "Limpiar todo" : "Clear all"}
              </Button>
            </div>
          )}

          {/* Results Count */}
          <p className="text-sm text-muted-foreground mb-4">
            {t.showing} {filteredProducts.length} {language === "es" ? "de" : "of"} {totalProducts} {t.products}
            {totalPages > 1 && ` (${language === "es" ? "Página" : "Page"} ${currentPage} ${language === "es" ? "de" : "of"} ${totalPages})`}
          </p>

          {/* Products Grid */}
          {isLoading ? (
            <div
              className={`grid gap-6 ${
                viewMode === "grid"
                  ? "grid-cols-2 sm:grid-cols-2 xl:grid-cols-3"
                  : "grid-cols-1"
              }`}
            >
              {[...Array(9)].map((_, i) => (
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
          ) : filteredProducts.length > 0 ? (
            <>
              <div
                className={`grid gap-3 sm:gap-6 ${
                  viewMode === "grid"
                    ? "grid-cols-2 sm:grid-cols-2 xl:grid-cols-3"
                    : "grid-cols-1"
                }`}
              >
                {filteredProducts.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-8 pt-8 border-t">
                  <Button
                    variant="outline"
                    onClick={() => fetchProducts(currentPage - 1)}
                    disabled={currentPage <= 1 || isLoading}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    {language === "es" ? "Anterior" : "Previous"}
                  </Button>
                  <div className="flex items-center gap-2">
                    {/* Page numbers */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => fetchProducts(pageNum)}
                          disabled={isLoading}
                          className="w-10"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => fetchProducts(currentPage + 1)}
                    disabled={currentPage >= totalPages || isLoading}
                  >
                    {language === "es" ? "Siguiente" : "Next"}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </>
          ) : (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground mb-4">
                {t.noProducts}
              </p>
              <Button variant="outline" onClick={clearFilters}>
                {t.clearFilters}
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <ProductsContent />
    </Suspense>
  );
}
