"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, Store, FolderSync, Plus, Pencil, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  parentId?: string;
  isActive: boolean;
  sortOrder: number;
}

interface SyncPreview {
  totalInProducts: number;
  existingCategories: number;
  missingCategories: number;
  missing: string[];
}

const defaultCategoryForm = { name: "", description: "", color: "bg-blue-500/10 text-blue-500", parentId: "", isActive: true };

export default function StoreSettingsPage() {
  const sessionResult = useSession();
  const session = sessionResult?.data;
  const status = sessionResult?.status;
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState(defaultCategoryForm);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncPreview, setSyncPreview] = useState<SyncPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Admin check
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/admin/login");
    } else if (session?.user && session.user.role !== "admin") {
      toast.error("Access denied. Admin privileges required.");
      router.push("/admin");
    }
  }, [status, session, router]);

  // Fetch categories on mount (same as products page)
  useEffect(() => {
    fetchCategories();
    fetchSyncPreview();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      setCategories(data.categories || []);
    } catch { console.error("Failed to load categories"); }
    finally { setIsLoadingCategories(false); }
  };

  const fetchSyncPreview = async () => {
    setIsLoadingPreview(true);
    try {
      const res = await fetch("/api/categories/sync-from-products");
      const data = await res.json();
      setSyncPreview(data);
    } catch { console.error("Failed to load sync preview"); }
    finally { setIsLoadingPreview(false); }
  };

  const handleSyncCategories = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/categories/sync-from-products", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        fetchCategories();
        fetchSyncPreview();
      } else { toast.error(data.error || "Sync failed"); }
    } catch { toast.error("Sync failed"); }
    finally { setIsSyncing(false); }
  };

  const openCategoryDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({ name: category.name, description: category.description || "", color: category.color || "bg-blue-500/10 text-blue-500", parentId: category.parentId || "", isActive: category.isActive });
    } else {
      setEditingCategory(null);
      setCategoryForm(defaultCategoryForm);
    }
    setIsCategoryDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) { toast.error("Category name is required"); return; }
    setIsSubmitting(true);
    try {
      const url = editingCategory ? `/api/categories/${editingCategory._id}` : "/api/categories";
      const method = editingCategory ? "PUT" : "POST";
      const payload = {
        ...categoryForm,
        parentId: categoryForm.parentId || null,
      };
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) {
        toast.success(editingCategory ? "Category updated" : "Category created");
        setIsCategoryDialogOpen(false);
        fetchCategories();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save category");
      }
    } catch { toast.error("Failed to save category"); }
    finally { setIsSubmitting(false); }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (res.ok) { toast.success("Category deleted"); fetchCategories(); }
      else { toast.error("Failed to delete category"); }
    } catch { toast.error("Failed to delete category"); }
  };

  // Show loading only during initial session fetch
  if (status === "loading") {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Store Settings</h1>
        <p className="text-muted-foreground mt-1">Manage categories and store configuration.</p>
      </div>

      {/* Sync Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FolderSync className="w-5 h-5" />Category Sync</CardTitle>
          <CardDescription>Sync categories from your imported products.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              {isLoadingPreview ? <Loader2 className="h-4 w-4 animate-spin" /> : syncPreview && (
                <p className="text-sm text-muted-foreground">
                  {syncPreview.missingCategories > 0 ? <span className="text-orange-500 font-medium">{syncPreview.missingCategories} new categories</span> : <span className="text-green-500">All synced</span>}
                  {" • "}{syncPreview.existingCategories} existing • {syncPreview.totalInProducts} in products
                </p>
              )}
            </div>
            <Button onClick={handleSyncCategories} disabled={isSyncing || !syncPreview?.missingCategories}>
              {isSyncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Sync Now
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Categories Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Store className="w-5 h-5" />Categories</CardTitle>
              <CardDescription>Manage product categories for your store.</CardDescription>
            </div>
            <Button onClick={() => openCategoryDialog()}><Plus className="h-4 w-4 mr-2" />Add Category</Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingCategories ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : categories.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No categories yet. Add one or sync from products.</p>
          ) : (
            <div className="space-y-4">
              {categories
                .filter((c) => !c.parentId)
                .map((parent) => {
                  const children = categories.filter((c) => c.parentId === parent._id);
                  return (
                    <div key={parent._id} className="border rounded-lg">
                      <div className="flex items-center justify-between p-3 bg-muted/40 rounded-t-lg">
                        <div className="flex items-center gap-3">
                          <Badge variant={parent.isActive ? "default" : "secondary"}>
                            {parent.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <span className="font-semibold">{parent.name}</span>
                          <span className="text-xs text-muted-foreground">
                            Top-level · {children.length} subcategor{children.length === 1 ? "y" : "ies"}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openCategoryDialog(parent)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(parent._id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      {children.length > 0 && (
                        <div className="divide-y">
                          {children.map((sub) => (
                            <div key={sub._id} className="flex items-center justify-between p-3 pl-8">
                              <div className="flex items-center gap-3">
                                <Badge variant={sub.isActive ? "default" : "secondary"}>
                                  {sub.isActive ? "Active" : "Inactive"}
                                </Badge>
                                <span>{sub.name}</span>
                                {sub.description && (
                                  <span className="text-sm text-muted-foreground">- {sub.description}</span>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button variant="ghost" size="icon" onClick={() => openCategoryDialog(sub)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(sub._id)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              {/* Orphans: children whose parent was deleted */}
              {(() => {
                const parentIds = new Set(categories.filter((c) => !c.parentId).map((c) => c._id));
                const orphans = categories.filter((c) => c.parentId && !parentIds.has(c.parentId));
                if (orphans.length === 0) return null;
                return (
                  <div className="border rounded-lg border-dashed">
                    <div className="p-3 text-sm text-muted-foreground">Unlinked (parent missing)</div>
                    <div className="divide-y">
                      {orphans.map((sub) => (
                        <div key={sub._id} className="flex items-center justify-between p-3 pl-8">
                          <span>{sub.name}</span>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon" onClick={() => openCategoryDialog(sub)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(sub._id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "Add Category"}</DialogTitle>
            <DialogDescription>Fill in the category details below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="catName">Name</Label>
              <Input id="catName" value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} placeholder="Category name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="catDesc">Description</Label>
              <Input id="catDesc" value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} placeholder="Optional description" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="catParent">Parent</Label>
              <Select
                value={categoryForm.parentId || "__none__"}
                onValueChange={(v) =>
                  setCategoryForm({ ...categoryForm, parentId: v === "__none__" ? "" : v })
                }
              >
                <SelectTrigger id="catParent">
                  <SelectValue placeholder="None (top-level nav item)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None (top-level nav item)</SelectItem>
                  {categories
                    .filter((c) => !c.parentId && c._id !== editingCategory?._id)
                    .map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Top-level items appear in the site nav bar. Child categories appear in that item&apos;s dropdown.
              </p>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="catActive">Active</Label>
              <Switch id="catActive" checked={categoryForm.isActive} onCheckedChange={(checked) => setCategoryForm({ ...categoryForm, isActive: checked })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveCategory} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {editingCategory ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

