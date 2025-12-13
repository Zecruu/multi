"use client";

import { useState, useEffect } from "react";
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
  X,
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
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [productImages, setProductImages] = useState<UploadedImage[]>([]);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  // Fetch products and categories on mount
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
      const response = await fetch("/api/products");
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
      toast.error("Failed to load products");
    } finally {
      setIsLoading(false);
    }
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

  return (
    <div className="space-y-6">
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categories *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between"
                        disabled={isSubmitting}
                      >
                        {formData.categories.length > 0
                          ? `${formData.categories.length} selected`
                          : "Select categories"}
                        <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-2" align="start">
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {categories.length === 0 ? (
                          <p className="text-sm text-muted-foreground p-2">
                            No categories. Create them in Settings.
                          </p>
                        ) : (
                          categories.map((cat) => (
                            <div
                              key={cat._id}
                              className="flex items-center space-x-2 p-2 hover:bg-muted rounded cursor-pointer"
                              onClick={() => toggleCategory(cat.slug)}
                            >
                              <Checkbox
                                checked={formData.categories.includes(cat.slug)}
                                onCheckedChange={() => toggleCategory(cat.slug)}
                              />
                              <span className="text-lg mr-1">{cat.icon || "📁"}</span>
                              <span className="text-sm">{cat.name}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                  {formData.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
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

              <div className="grid grid-cols-3 gap-4">
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
                  <Label htmlFor="costPrice">Cost Price (Admin Only)</Label>
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
                  {formData.isOnSale && (
                    <p className="text-xs text-muted-foreground">Auto-set when sale is active</p>
                  )}
                </div>
              </div>

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

              <div className="grid grid-cols-3 gap-4">
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
                    placeholder="0"
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
            <div className="text-2xl font-bold text-foreground">{products.length}</div>
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
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card className="bg-card">
        <CardContent className="p-0">
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
                filteredProducts.map((product) => (
                  <TableRow key={product._id}>
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
                        <p className="text-sm text-muted-foreground">{product.sku}</p>
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
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
