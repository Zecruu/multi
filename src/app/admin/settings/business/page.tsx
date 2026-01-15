"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Building,
  Bell,
  Shield,
  Tags,
  Plus,
  Edit,
  Trash2,
  Loader2,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

interface SyncPreview {
  totalInProducts: number;
  existingCategories: number;
  missingCategories: number;
  missing: string[];
}

interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  isActive: boolean;
  sortOrder: number;
}

const defaultCategoryForm = {
  name: "",
  description: "",
  color: "bg-blue-500/10 text-blue-500",
  isActive: true,
  sortOrder: 0,
};

function BusinessSettingsPage() {
  const sessionData = useSession();
  const session = sessionData?.data;
  const status = sessionData?.status;
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState(defaultCategoryForm);
  
  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncPreview, setSyncPreview] = useState<SyncPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Admin check
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/admin/login");
    } else if (status === "authenticated" && session?.user?.role !== "admin") {
      toast.error("Access denied. Admin privileges required.");
      router.push("/admin/settings/account");
    }
  }, [status, session, router]);

  useEffect(() => {
    if (session?.user?.role === "admin") {
      fetchCategories();
      fetchSyncPreview();
    }
  }, [session]);

  const fetchCategories = async () => {
    try {
      setIsLoadingCategories(true);
      const response = await fetch("/api/categories");
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      toast.error("Failed to load categories");
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const fetchSyncPreview = async () => {
    try {
      setIsLoadingPreview(true);
      const response = await fetch("/api/categories/sync-from-products");
      if (response.ok) {
        const data = await response.json();
        setSyncPreview(data);
      }
    } catch (error) {
      console.error("Failed to fetch sync preview:", error);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleSyncCategories = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch("/api/categories/sync-from-products", {
        method: "POST",
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to sync categories");
      }
      
      toast.success(`${data.created} new categories created!`);
      fetchCategories();
      fetchSyncPreview();
    } catch (error) {
      console.error("Sync error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to sync categories");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name) {
      toast.error("Category name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const url = editingCategory
        ? `/api/categories/${editingCategory._id}`
        : "/api/categories";
      const method = editingCategory ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(categoryForm),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server error. Please try again.");
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save category");
      }

      toast.success(editingCategory ? "Category updated" : "Category created");
      setIsCategoryDialogOpen(false);
      resetCategoryForm();
      fetchCategories();
    } catch (error) {
      console.error("Category save error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save category");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    try {
      const response = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete category");
      toast.success("Category deleted");
      fetchCategories();
    } catch {
      toast.error("Failed to delete category");
    }
  };

  const openEditDialog = (category: Category) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      description: category.description || "",
      color: category.color || "bg-blue-500/10 text-blue-500",
      isActive: category.isActive,
      sortOrder: category.sortOrder,
    });
    setIsCategoryDialogOpen(true);
  };

  const resetCategoryForm = () => {
    setEditingCategory(null);
    setCategoryForm(defaultCategoryForm);
  };

  // Loading state
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Access denied for non-admins
  if (session?.user?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p className="text-muted-foreground">You need administrator privileges to access this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Business Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your store settings and integrations. (Admin Only)
        </p>
      </div>

      <Tabs defaultValue="categories" className="space-y-6">
        <TabsList className="bg-card">
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        {/* Categories Settings */}
        <TabsContent value="categories" className="space-y-6">
          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Tags className="w-5 h-5" />
                  Product Categories
                </CardTitle>
                <CardDescription>
                  Create and manage product categories for your store.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {/* Sync from Products Button */}
                <Button
                  variant="outline"
                  onClick={handleSyncCategories}
                  disabled={isSyncing || isLoadingPreview || (syncPreview?.missingCategories === 0)}
                >
                  {isSyncing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Sync from Products
                      {syncPreview && syncPreview.missingCategories > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {syncPreview.missingCategories} new
                        </Badge>
                      )}
                    </>
                  )}
                </Button>
                <Dialog open={isCategoryDialogOpen} onOpenChange={(open) => {
                  setIsCategoryDialogOpen(open);
                  if (!open) resetCategoryForm();
                }}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Category
                    </Button>
                  </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingCategory ? "Edit Category" : "Add New Category"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCategorySubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="catName">Name *</Label>
                      <Input
                        id="catName"
                        value={categoryForm.name}
                        onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                        placeholder="e.g., Wiring"
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="catDescription">Description</Label>
                      <Input
                        id="catDescription"
                        value={categoryForm.description}
                        onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                        placeholder="Optional description"
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="catOrder">Sort Order</Label>
                      <Input
                        id="catOrder"
                        type="number"
                        value={categoryForm.sortOrder}
                        onChange={(e) => setCategoryForm({ ...categoryForm, sortOrder: parseInt(e.target.value) || 0 })}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="catActive">Active</Label>
                      <Switch
                        id="catActive"
                        checked={categoryForm.isActive}
                        onCheckedChange={(checked) => setCategoryForm({ ...categoryForm, isActive: checked })}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsCategoryDialogOpen(false);
                          resetCategoryForm();
                        }}
                        disabled={isSubmitting}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : editingCategory ? (
                          "Update Category"
                        ) : (
                          "Create Category"
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {/* Missing Categories Preview */}
              {syncPreview && syncPreview.missingCategories > 0 && (
                <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400 mb-2">
                    {syncPreview.missingCategories} categories from imported products need to be created:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {syncPreview.missing.slice(0, 10).map((cat) => (
                      <Badge key={cat} variant="outline" className="text-xs">
                        {cat}
                      </Badge>
                    ))}
                    {syncPreview.missing.length > 10 && (
                      <Badge variant="outline" className="text-xs">
                        +{syncPreview.missing.length - 10} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Icon</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingCategories ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : categories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No categories yet. Create your first category.
                      </TableCell>
                    </TableRow>
                  ) : (
                    categories.map((category) => (
                      <TableRow key={category._id}>
                        <TableCell className="text-2xl">{category.icon || "📁"}</TableCell>
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell className="text-muted-foreground">{category.slug}</TableCell>
                        <TableCell>
                          <Badge variant={category.isActive ? "default" : "secondary"}>
                            {category.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>{category.sortOrder}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(category)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeleteCategory(category._id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Building className="w-5 h-5" />
                Business Information
              </CardTitle>
              <CardDescription>
                Update your business details and contact information.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input id="businessName" defaultValue="Multi Electric Supply" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Contact Email</Label>
                  <Input id="email" type="email" defaultValue="hzayas@multielectricpr.com" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" defaultValue="+1 (787) 963-0569" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input id="website" defaultValue="https://multielectricpr.com" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" defaultValue="Av. 65 de Infantería km 7.4" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" defaultValue="Carolina" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State/Territory</Label>
                  <Input id="state" defaultValue="PR" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP Code</Label>
                  <Input id="zip" defaultValue="00923" />
                </div>
              </div>
              <div className="flex justify-end">
                <Button>Save Changes</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Shield className="w-5 h-5" />
                Tax Settings
              </CardTitle>
              <CardDescription>
                Configure tax rates and calculations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="taxRate">Puerto Rico Sales Tax (%)</Label>
                  <Input id="taxRate" type="number" step="0.01" defaultValue="11.5" disabled />
                  <p className="text-xs text-muted-foreground">Combined state + municipal tax rate</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxId">Tax ID / EIN</Label>
                  <Input id="taxId" defaultValue="XX-XXXXXXX" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Calculate tax automatically</p>
                  <p className="text-sm text-muted-foreground">
                    Automatically calculate tax based on shipping address
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex justify-end">
                <Button>Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Bell className="w-5 h-5" />
                Email Notifications
              </CardTitle>
              <CardDescription>
                Configure when you receive email notifications.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">New Orders</p>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications for new orders
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Low Stock Alerts</p>
                  <p className="text-sm text-muted-foreground">
                    Get notified when products are running low
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Payment Failures</p>
                  <p className="text-sm text-muted-foreground">
                    Receive alerts for failed payments
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">New Client Registrations</p>
                  <p className="text-sm text-muted-foreground">
                    Get notified when new clients sign up
                  </p>
                </div>
                <Switch />
              </div>
              <div className="flex justify-end">
                <Button>Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default dynamic(() => Promise.resolve(BusinessSettingsPage), { ssr: false });
