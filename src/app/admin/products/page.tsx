"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Package,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  PackageX,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageUpload, UploadedImage } from "@/components/ui/image-upload";
import { toast } from "sonner";

interface Category {
  _id: string;
  name: string;
  slug: string;
  icon?: string;
  parentId?: string;
  isActive: boolean;
}

interface Product {
  _id: string;
  name: string;
  sku: string;
  category: string;
  categories?: string[];
  price: number;
  isOnSale?: boolean;
  salePrice?: number;
  quantity: number;
  status: string;
  images: { url: string; key: string; isPrimary: boolean }[];
}

interface ProductFormData {
  name: string;
  nameEs: string;
  sku: string;
  categories: string[];
  brand: string;
  description: string;
  descriptionEs: string;
  price: string;
  compareAtPrice: string;
  costPrice: string;
  quantity: string;
  lowStockThreshold: string;
  unit: string;
  status: string;
  isOnSale: boolean;
  salePrice: string;
}

const initialFormData: ProductFormData = {
  name: "",
  nameEs: "",
  sku: "",
  categories: [],
  brand: "",
  description: "",
  descriptionEs: "",
  price: "",
  compareAtPrice: "",
  costPrice: "",
  quantity: "",
  lowStockThreshold: "10",
  unit: "piece",
  status: "draft",
  isOnSale: false,
  salePrice: "",
};

export default function ProductsPage() {
  // Wrap in Suspense — Next 16 requires it for useSearchParams in
  // client page components.
  return (
    <Suspense fallback={null}>
      <ProductsPageInner />
    </Suspense>
  );
}

function ProductsPageInner() {
  // Honor URL params so Sparky (and bookmarks) can deep-link into a
  // pre-filtered view. e.g. /admin/products?search=SO
  const urlParams = useSearchParams();
  const urlSearch = urlParams?.get("search") ?? "";
  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [productImages, setProductImages] = useState<UploadedImage[]>([]);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [totalProducts, setTotalProducts] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [showOutOfStock, setShowOutOfStock] = useState(false);
  const productsPerPage = 50;

  // Sparky pending-action state: when Sparky stages a bulk delete/archive,
  // a banner appears here with the affected product IDs red-highlighted in
  // the table and Approve / Cancel buttons.
  type SparkyPendingAction = {
    _id: string;
    actionType: "delete" | "archive";
    productIds: string[];
    matchCount: number;
    summary: string;
    createdBy: string;
  };
  const [pendingAction, setPendingAction] = useState<SparkyPendingAction | null>(null);
  const [approving, setApproving] = useState(false);
  const pendingSet = new Set(pendingAction?.productIds ?? []);

  const fetchPendingAction = async () => {
    try {
      const res = await fetch("/api/admin/sparky-actions/current");
      if (!res.ok) return;
      const data = await res.json();
      setPendingAction(data.action);
    } catch {
      // silent — banner just won't show
    }
  };

  // Fetch categories + start pending-action poll on mount only.
  useEffect(() => {
    fetchCategories();
    fetchPendingAction();
    const t = setInterval(fetchPendingAction, 10_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync searchQuery whenever the URL ?search= param changes — Sparky
  // soft-navigates here without remounting, so we have to react to it.
  useEffect(() => {
    setSearchQuery(urlSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSearch]);

  // Debounced server-side fetch whenever searchQuery changes (from either
  // URL param or typing in the box).
  useEffect(() => {
    const t = setTimeout(() => {
      fetchProducts(1, showOutOfStock, searchQuery);
    }, searchQuery === urlSearch ? 0 : 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, showOutOfStock]);

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

  const fetchProducts = async (
    page = 1,
    outOfStockOnly = showOutOfStock,
    search = searchQuery
  ) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(productsPerPage),
      });
      if (outOfStockOnly) {
        params.set("outOfStock", "true");
      }
      // Push search to the server so we filter across all products, not
      // just the current page. The existing client-side filter below still
      // runs on the returned page for "type-to-refine" snappiness.
      if (search) {
        params.set("search", search);
      }
      const response = await fetch(`/api/products?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
        setTotalProducts(data.pagination?.total || 0);
        setCurrentPage(data.pagination?.page || 1);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
      toast.error("Failed to load products");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleOutOfStock = () => {
    const next = !showOutOfStock;
    setShowOutOfStock(next);
    fetchProducts(1, next);
  };

  const handleInputChange = (field: keyof ProductFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setProductImages([]);
    setEditingProductId(null);
  };

  const handleEditProduct = async (productId: string) => {
    try {
      const response = await fetch(`/api/products/${productId}`);
      if (!response.ok) throw new Error("Failed to fetch product");
      
      const product = await response.json();
      
      setFormData({
        name: product.name || "",
        nameEs: product.nameEs || "",
        sku: product.sku || "",
        categories: product.categories || [product.category],
        brand: product.brand || "",
        description: product.description || "",
        descriptionEs: product.descriptionEs || "",
        price: product.price?.toString() || "",
        compareAtPrice: product.compareAtPrice?.toString() || "",
        costPrice: product.costPrice?.toString() || "",
        quantity: product.quantity?.toString() || "",
        lowStockThreshold: product.lowStockThreshold?.toString() || "10",
        unit: product.unit || "piece",
        status: product.status || "draft",
        isOnSale: product.isOnSale || false,
        salePrice: product.salePrice?.toString() || "",
      });
      
      setProductImages(product.images?.map((img: any) => ({
        url: img.url,
        key: img.key,
        isPrimary: img.isPrimary,
      })) || []);
      
      setEditingProductId(productId);
      setIsDialogOpen(true);
    } catch (error) {
      console.error("Failed to load product:", error);
      toast.error("Failed to load product for editing");
    }
  };

  const toggleCategory = (categorySlug: string) => {
    setFormData((prev) => ({
      ...prev,
      categories: prev.categories.includes(categorySlug)
        ? prev.categories.filter((c) => c !== categorySlug)
        : [...prev.categories, categorySlug],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name || !formData.sku || formData.categories.length === 0 || !formData.description || !formData.price || !formData.quantity) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate sale price if on sale
    if (formData.isOnSale && (!formData.salePrice || parseFloat(formData.salePrice) >= parseFloat(formData.price))) {
      toast.error("Sale price must be less than regular price");
      return;
    }

    setIsSubmitting(true);

    try {
      // Parse sale price - ensure it's a valid number
      const salePriceValue = formData.isOnSale && formData.salePrice 
        ? parseFloat(formData.salePrice) 
        : null;
      
      const productData = {
        name: formData.name,
        nameEs: formData.nameEs || undefined,
        sku: formData.sku.toUpperCase(),
        category: formData.categories[0], // Primary category for backward compatibility
        categories: formData.categories,
        brand: formData.brand || undefined,
        description: formData.description,
        descriptionEs: formData.descriptionEs || undefined,
        price: parseFloat(formData.price),
        compareAtPrice: formData.isOnSale ? parseFloat(formData.price) : (formData.compareAtPrice ? parseFloat(formData.compareAtPrice) : null),
        costPrice: formData.costPrice ? parseFloat(formData.costPrice) : null,
        quantity: parseInt(formData.quantity),
        lowStockThreshold: parseInt(formData.lowStockThreshold) || 10,
        unit: formData.unit,
        status: formData.status,
        isOnSale: formData.isOnSale,
        salePrice: salePriceValue,
        images: productImages.map((img, index) => ({
          url: img.url,
          key: img.key,
          isPrimary: img.isPrimary || index === 0,
        })),
      };
      
      // Debug log
      console.log("Sending product data:", { isOnSale: productData.isOnSale, salePrice: productData.salePrice, price: productData.price });

      const isEditing = !!editingProductId;
      const url = isEditing ? `/api/products/${editingProductId}` : "/api/products";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to ${isEditing ? "update" : "create"} product`);
      }

      toast.success(`Product ${isEditing ? "updated" : "created"} successfully`);
      setIsDialogOpen(false);
      resetForm();
      fetchProducts();
    } catch (error) {
      console.error(`Failed to ${editingProductId ? "update" : "create"} product:`, error);
      toast.error(error instanceof Error ? error.message : `Failed to ${editingProductId ? "update" : "create"} product`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete product");
      }

      toast.success("Product deleted successfully");
      fetchProducts();
    } catch (error) {
      console.error("Failed to delete product:", error);
      toast.error("Failed to delete product");
    }
  };

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/30">Active</Badge>;
      case "draft":
        return <Badge className="bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30">Draft</Badge>;
      case "archived":
        return <Badge className="bg-gray-500/20 text-gray-500 hover:bg-gray-500/30">Archived</Badge>;
      default:
        return null;
    }
  };

  const getStockBadge = (quantity: number) => {
    if (quantity === 0) {
      return <Badge className="bg-red-500/20 text-red-500">Out of Stock</Badge>;
    }
    if (quantity < 10) {
      return <Badge className="bg-yellow-500/20 text-yellow-500">Low Stock</Badge>;
    }
    return <Badge className="bg-green-500/20 text-green-500">In Stock</Badge>;
  };

  async function approveSparkyAction() {
    if (!pendingAction) return;
    setApproving(true);
    try {
      const res = await fetch(`/api/admin/sparky-actions/${pendingAction._id}/approve`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "approve failed");
      toast.success(data.message || "Done");
      setPendingAction(null);
      fetchProducts(currentPage, showOutOfStock, searchQuery);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setApproving(false);
    }
  }

  async function rejectSparkyAction() {
    if (!pendingAction) return;
    try {
      await fetch(`/api/admin/sparky-actions/${pendingAction._id}/reject`, {
        method: "POST",
      });
      toast.success("Sparky action canceled");
      setPendingAction(null);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      {/* Sparky pending-action banner */}
      {pendingAction && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 flex items-start gap-4">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-red-700 dark:text-red-400">
              Sparky staged {pendingAction.matchCount} product{pendingAction.matchCount === 1 ? "" : "s"} to {pendingAction.actionType}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Filter: {pendingAction.summary} · Requested by {pendingAction.createdBy}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Rows below are highlighted in red. Review them, then approve or cancel.
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button size="sm" variant="outline" onClick={rejectSparkyAction}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={approveSparkyAction}
              disabled={approving}
            >
              {approving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Approve {pendingAction.actionType}
            </Button>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Products</h1>
          <p className="text-muted-foreground mt-1">
            Manage your product catalog and inventory.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProductId ? "Edit Product" : "Add New Product"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Image Upload */}
              <div className="space-y-2">
                <Label>Product Images (Optional)</Label>
                <ImageUpload
                  images={productImages}
                  onImagesChange={setProductImages}
                  maxImages={5}
                  maxSizeMB={5}
                  disabled={isSubmitting}
                />
              </div>

              {/* Product Name with Language Tabs */}
              <Tabs defaultValue="en" className="w-full">
                <div className="flex items-center justify-between mb-2">
                  <Label>Product Name *</Label>
                  <TabsList className="h-8">
                    <TabsTrigger value="en" className="text-xs px-2 py-1">🇺🇸 English</TabsTrigger>
                    <TabsTrigger value="es" className="text-xs px-2 py-1">🇪🇸 Spanish</TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="en" className="mt-0">
                  <Input 
                    id="name" 
                    placeholder="Enter product name in English"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    disabled={isSubmitting}
                  />
                </TabsContent>
                <TabsContent value="es" className="mt-0">
                  <Input 
                    id="nameEs" 
                    placeholder="Ingrese el nombre del producto en Español"
                    value={formData.nameEs}
                    onChange={(e) => handleInputChange("nameEs", e.target.value)}
                    disabled={isSubmitting}
                  />
                </TabsContent>
              </Tabs>

              <div className="space-y-2">
                <Label htmlFor="sku">SKU *</Label>
                <Input 
                  id="sku" 
                  placeholder="Enter SKU"
                  value={formData.sku}
                  onChange={(e) => handleInputChange("sku", e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 items-start">
                <div className="space-y-2">
                  <Label>Categories *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between h-10"
                        disabled={isSubmitting}
                      >
                        {formData.categories.length > 0
                          ? `${formData.categories.length} selected`
                          : "Select categories"}
                        <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-2" align="start">
                      <div className="space-y-1 max-h-72 overflow-y-auto">
                        {categories.length === 0 ? (
                          <p className="text-sm text-muted-foreground p-2">
                            No categories. Create them in Settings.
                          </p>
                        ) : (
                          (() => {
                            const parents = categories.filter((c) => !c.parentId);
                            const parentIds = new Set(parents.map((p) => p._id));
                            const orphans = categories.filter(
                              (c) => c.parentId && !parentIds.has(c.parentId)
                            );
                            return (
                              <>
                                {parents.map((parent) => {
                                  const kids = categories.filter(
                                    (c) => c.parentId === parent._id
                                  );
                                  return (
                                    <div key={parent._id} className="mb-2">
                                      <div
                                        className="flex items-center space-x-2 p-2 hover:bg-muted rounded cursor-pointer font-semibold"
                                        onClick={() => toggleCategory(parent.slug)}
                                      >
                                        <Checkbox
                                          checked={formData.categories.includes(parent.slug)}
                                          onCheckedChange={() => toggleCategory(parent.slug)}
                                        />
                                        <span className="text-lg mr-1">{parent.icon || "📁"}</span>
                                        <span className="text-sm">{parent.name}</span>
                                      </div>
                                      {kids.map((sub) => (
                                        <div
                                          key={sub._id}
                                          className="flex items-center space-x-2 p-2 pl-8 hover:bg-muted rounded cursor-pointer"
                                          onClick={() => toggleCategory(sub.slug)}
                                        >
                                          <Checkbox
                                            checked={formData.categories.includes(sub.slug)}
                                            onCheckedChange={() => toggleCategory(sub.slug)}
                                          />
                                          <span className="text-sm">{sub.name}</span>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })}
                                {orphans.length > 0 && (
                                  <div className="pt-2 mt-2 border-t">
                                    <p className="text-xs text-muted-foreground px-2 pb-1">Other</p>
                                    {orphans.map((cat) => (
                                      <div
                                        key={cat._id}
                                        className="flex items-center space-x-2 p-2 hover:bg-muted rounded cursor-pointer"
                                        onClick={() => toggleCategory(cat.slug)}
                                      >
                                        <Checkbox
                                          checked={formData.categories.includes(cat.slug)}
                                          onCheckedChange={() => toggleCategory(cat.slug)}
                                        />
                                        <span className="text-sm">{cat.name}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </>
                            );
                          })()
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                  {formData.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {formData.categories.map((slug) => {
                        const cat = categories.find((c) => c.slug === slug);
                        return (
                          <Badge key={slug} variant="secondary" className="gap-1">
                            {cat?.icon} {cat?.name || slug}
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={() => toggleCategory(slug)}
                            />
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand">Brand</Label>
                  <Input 
                    id="brand" 
                    placeholder="Enter brand"
                    value={formData.brand}
                    onChange={(e) => handleInputChange("brand", e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Description with Language Tabs */}
              <Tabs defaultValue="en" className="w-full">
                <div className="flex items-center justify-between mb-2">
                  <Label>Description *</Label>
                  <TabsList className="h-8">
                    <TabsTrigger value="en" className="text-xs px-2 py-1">🇺🇸 English</TabsTrigger>
                    <TabsTrigger value="es" className="text-xs px-2 py-1">🇪🇸 Spanish</TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="en" className="mt-0">
                  <Textarea
                    id="description"
                    placeholder="Enter product description in English..."
                    rows={4}
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    disabled={isSubmitting}
                  />
                </TabsContent>
                <TabsContent value="es" className="mt-0">
                  <Textarea
                    id="descriptionEs"
                    placeholder="Ingrese la descripción del producto en Español..."
                    rows={4}
                    value={formData.descriptionEs}
                    onChange={(e) => handleInputChange("descriptionEs", e.target.value)}
                    disabled={isSubmitting}
                  />
                </TabsContent>
              </Tabs>

              <div className="grid grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                  <Label htmlFor="price">Regular Price *</Label>
                  <Input 
                    id="price" 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00"
                    value={formData.price}
                    onChange={(e) => handleInputChange("price", e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="costPrice">Cost Price</Label>
                  <Input 
                    id="costPrice" 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00"
                    value={formData.costPrice}
                    onChange={(e) => handleInputChange("costPrice", e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="comparePrice">Compare at Price</Label>
                  <Input 
                    id="comparePrice" 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00"
                    value={formData.compareAtPrice}
                    onChange={(e) => handleInputChange("compareAtPrice", e.target.value)}
                    disabled={isSubmitting || formData.isOnSale}
                  />
                </div>
              </div>
              {formData.isOnSale && (
                <p className="text-xs text-muted-foreground -mt-2">Compare at Price is auto-set when sale is active</p>
              )}

              {/* Sale Price Section */}
              <Card className="border-dashed">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="isOnSale"
                        checked={formData.isOnSale}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isOnSale: checked as boolean }))}
                        disabled={isSubmitting}
                      />
                      <Label htmlFor="isOnSale" className="font-semibold cursor-pointer">
                        Apply Sale Price
                      </Label>
                    </div>
                    {formData.isOnSale && formData.price && formData.salePrice && (
                      <Badge className="bg-red-500 text-white">
                        {Math.round(((parseFloat(formData.price) - parseFloat(formData.salePrice)) / parseFloat(formData.price)) * 100)}% OFF
                      </Badge>
                    )}
                  </div>
                  {formData.isOnSale && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="salePrice">Sale Price *</Label>
                        <Input 
                          id="salePrice" 
                          type="number" 
                          step="0.01" 
                          placeholder="0.00"
                          value={formData.salePrice}
                          onChange={(e) => handleInputChange("salePrice", e.target.value)}
                          disabled={isSubmitting}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Preview</Label>
                        <div className="p-3 bg-muted rounded-lg">
                          {formData.price && formData.salePrice ? (
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold text-green-600">${parseFloat(formData.salePrice).toFixed(2)}</span>
                              <span className="text-sm text-muted-foreground line-through">${parseFloat(formData.price).toFixed(2)}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Enter prices to preview</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input 
                    id="quantity" 
                    type="number" 
                    placeholder="0"
                    value={formData.quantity}
                    onChange={(e) => handleInputChange("quantity", e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lowStock">Low Stock Threshold</Label>
                  <Input 
                    id="lowStock" 
                    type="number" 
                    placeholder="10"
                    value={formData.lowStockThreshold}
                    onChange={(e) => handleInputChange("lowStockThreshold", e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Select 
                    value={formData.unit} 
                    onValueChange={(value) => handleInputChange("unit", value)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="piece">Piece</SelectItem>
                      <SelectItem value="box">Box</SelectItem>
                      <SelectItem value="roll">Roll</SelectItem>
                      <SelectItem value="foot">Foot</SelectItem>
                      <SelectItem value="meter">Meter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value) => handleInputChange("status", value)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsDialogOpen(false);
                    resetForm();
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {editingProductId ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    editingProductId ? "Update Product" : "Create Product"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalProducts}</div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {products.filter((p) => p.status === "active").length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              Low Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">
              {products.filter((p) => p.quantity > 0 && p.quantity < 10).length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Out of Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {products.filter((p) => p.quantity === 0).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="bg-card">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat._id} value={cat.slug}>
                    {cat.icon} {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={showOutOfStock ? "default" : "outline"}
              onClick={toggleOutOfStock}
              className={showOutOfStock ? "bg-red-500 hover:bg-red-600 text-white" : ""}
            >
              <PackageX className="w-4 h-4 mr-2" />
              {showOutOfStock ? "Showing Out of Stock" : "Out of Stock"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card className="bg-card">
        <CardContent className="p-0">
          {/* Pagination Info */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <p className="text-sm text-muted-foreground">
              Showing {products.length > 0 ? ((currentPage - 1) * productsPerPage) + 1 : 0} to {Math.min(currentPage * productsPerPage, totalProducts)} of {totalProducts} products
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchProducts(currentPage - 1)}
                disabled={currentPage <= 1 || isLoading}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm">
                Page {currentPage} of {Math.ceil(totalProducts / productsPerPage) || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchProducts(currentPage + 1)}
                disabled={currentPage >= Math.ceil(totalProducts / productsPerPage) || isLoading}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Image</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="w-12 h-12 rounded-lg" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No products found. Add your first product to get started.
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => {
                  const isPending = pendingSet.has(product._id);
                  return (
                  <TableRow
                    key={product._id}
                    className={isPending ? "bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50" : undefined}
                  >
                    <TableCell>
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                        {product.images && product.images.length > 0 ? (
                          <img
                            src={product.images.find(img => img.isPrimary)?.url || product.images[0]?.url}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{product.name}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-muted-foreground">{product.sku}</p>
                          {isPending && pendingAction && (
                            <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30 text-[10px]">
                              Sparky: will {pendingAction.actionType}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{product.category}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {product.isOnSale && product.salePrice ? (
                        <div className="flex flex-col items-end">
                          <span className="text-green-600">${product.salePrice.toFixed(2)}</span>
                          <span className="text-xs text-muted-foreground line-through">${product.price.toFixed(2)}</span>
                        </div>
                      ) : (
                        `$${product.price.toFixed(2)}`
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-medium">{product.quantity}</span>
                        {getStockBadge(product.quantity)}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(product.status)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditProduct(product._id)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => handleDeleteProduct(product._id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
