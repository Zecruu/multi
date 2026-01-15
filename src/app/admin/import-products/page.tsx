"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Download,
  Trash2,
  Eye,
  FileUp,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

interface ImportError {
  row: number;
  sku: string;
  error: string;
}

interface PreviewProduct {
  sku: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  isNew: boolean;
}

interface ImportResult {
  success: boolean;
  message: string;
  created: number;
  updated: number;
  skipped: number;
  totalRows: number;
  errors: ImportError[];
  totalErrors: number;
  products?: PreviewProduct[];
  importedBy?: string;
  timestamp?: string;
}

export default function ImportProductsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dryRun, setDryRun] = useState(true);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [previewComplete, setPreviewComplete] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const uploadedFile = acceptedFiles[0];
    if (uploadedFile) {
      // Validate file type
      const fileName = uploadedFile.name.toLowerCase();
      if (!fileName.endsWith(".xls") && !fileName.endsWith(".xlsx")) {
        toast.error("Invalid file type. Please upload an Excel file (.xls or .xlsx)");
        return;
      }
      
      // Validate file size (10MB)
      if (uploadedFile.size > 10 * 1024 * 1024) {
        toast.error("File too large. Maximum size is 10MB.");
        return;
      }

      setFile(uploadedFile);
      setResult(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
    maxFiles: 1,
    multiple: false,
  });

  const handleImport = async (isDryRun: boolean = true) => {
    if (!file) {
      toast.error("Please select a file first");
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    setResult(null);
    setPreviewComplete(false);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("dryRun", isDryRun.toString());

      setUploadProgress(30);

      const response = await fetch("/api/admin/import-products", {
        method: "POST",
        body: formData,
      });

      setUploadProgress(70);

      const data = await response.json();

      setUploadProgress(100);

      if (!response.ok) {
        throw new Error(data.error || "Import failed");
      }

      setResult(data);

      if (data.success) {
        if (isDryRun) {
          toast.info(`Preview complete: ${data.created} products ready to import`);
          setPreviewComplete(true);
        } else {
          toast.success(`✅ Import complete: ${data.created} created, ${data.updated} updated`);
          setPreviewComplete(false);
        }
      } else {
        toast.warning("Import completed with errors. Check the results below.");
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to import products");
      setResult({
        success: false,
        message: error instanceof Error ? error.message : "Import failed",
        created: 0,
        updated: 0,
        skipped: 0,
        totalRows: 0,
        errors: [],
        totalErrors: 0,
      });
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setUploadProgress(0);
    setDryRun(true);
    setPreviewComplete(false);
  };

  const handleConfirmImport = () => {
    handleImport(false); // Actually import (not dry run)
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Import Products</h1>
        <p className="text-muted-foreground mt-1">
          Upload an Excel file to bulk import products into your catalog.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Import Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* File Upload Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                Upload Excel File
              </CardTitle>
              <CardDescription>
                Drag and drop your Excel file or click to browse. Supports .xls and .xlsx formats.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Dropzone */}
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                  transition-colors duration-200
                  ${isDragActive 
                    ? "border-primary bg-primary/5" 
                    : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
                  }
                  ${file ? "border-green-500 bg-green-500/5" : ""}
                `}
              >
                <input {...getInputProps()} />
                
                {file ? (
                  <div className="space-y-2">
                    <CheckCircle2 className="w-12 h-12 mx-auto text-green-500" />
                    <p className="font-medium text-foreground">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReset();
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove file
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                    {isDragActive ? (
                      <p className="text-primary font-medium">Drop the file here...</p>
                    ) : (
                      <>
                        <p className="font-medium text-foreground">
                          Drag & drop your Excel file here
                        </p>
                        <p className="text-sm text-muted-foreground">
                          or click to browse your files
                        </p>
                      </>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Maximum file size: 10MB
                    </p>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              {uploadProgress > 0 && (
                <div className="space-y-2">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-sm text-muted-foreground text-center">
                    {uploadProgress < 100 ? "Processing..." : "Complete!"}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-4 pt-4 border-t">
                {/* Step 1: Preview */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Step 1: Preview</p>
                    <p className="text-sm text-muted-foreground">Validate your file before importing</p>
                  </div>
                  <div className="flex gap-2">
                    {result && (
                      <Button variant="outline" onClick={handleReset}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Reset
                      </Button>
                    )}
                    <Button
                      onClick={() => handleImport(true)}
                      disabled={!file || isUploading}
                      variant={previewComplete ? "outline" : "default"}
                    >
                      {isUploading && dryRun ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Validating...
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4 mr-2" />
                          {previewComplete ? "Preview Again" : "Preview File"}
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Step 2: Confirm Import - Only show after successful preview */}
                {previewComplete && result && result.success && result.created > 0 && (
                  <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <div>
                      <p className="font-medium text-green-600">Step 2: Confirm Import</p>
                      <p className="text-sm text-muted-foreground">
                        Ready to import {result.created} products to your store
                      </p>
                    </div>
                    <Button
                      onClick={handleConfirmImport}
                      disabled={isUploading}
                      size="lg"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isUploading && !dryRun ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <FileUp className="w-4 h-4 mr-2" />
                          Import {result.created} Products Now
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Results Card */}
          {result && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  {previewComplete ? "Preview Results" : "Import Results"}
                </CardTitle>
                <CardDescription>{result.message}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-foreground">{result.totalRows}</p>
                    <p className="text-sm text-muted-foreground">Total Rows</p>
                  </div>
                  <div className="text-center p-4 bg-green-500/10 rounded-lg">
                    <p className="text-2xl font-bold text-green-500">{result.created}</p>
                    <p className="text-sm text-muted-foreground">
                      {previewComplete ? "To Create" : "Created"}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-blue-500/10 rounded-lg">
                    <p className="text-2xl font-bold text-blue-500">{result.updated}</p>
                    <p className="text-sm text-muted-foreground">
                      {previewComplete ? "To Update" : "Updated"}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-yellow-500/10 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-500">{result.skipped}</p>
                    <p className="text-sm text-muted-foreground">Skipped</p>
                  </div>
                </div>

                {/* Preview Products Table */}
                {previewComplete && result.products && result.products.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Preview (First 100 products)</h4>
                    <div className="border rounded-lg max-h-64 overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>SKU</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {result.products.map((product, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-mono text-xs">
                                {product.sku}
                              </TableCell>
                              <TableCell className="max-w-xs truncate">
                                {product.name}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{product.category}</Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                ${product.price.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right">
                                {product.quantity}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {/* Errors */}
                {result.errors && result.errors.length > 0 && (
                  <Accordion type="single" collapsible>
                    <AccordionItem value="errors">
                      <AccordionTrigger className="text-red-500">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          {result.totalErrors} Errors
                          {result.totalErrors > 50 && " (showing first 50)"}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="border rounded-lg max-h-48 overflow-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-16">Row</TableHead>
                                <TableHead className="w-32">SKU</TableHead>
                                <TableHead>Error</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {result.errors.map((error, idx) => (
                                <TableRow key={idx}>
                                  <TableCell>{error.row}</TableCell>
                                  <TableCell className="font-mono text-xs">
                                    {error.sku}
                                  </TableCell>
                                  <TableCell className="text-red-500 text-sm">
                                    {error.error}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}

                {/* Next Steps */}
                {!dryRun && result.success && result.created > 0 && (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>Import Successful!</AlertTitle>
                    <AlertDescription>
                      {result.created} products have been added to your catalog. 
                      They are now available on the store with &quot;active&quot; status.
                    </AlertDescription>
                  </Alert>
                )}

                {previewComplete && result.success && result.created > 0 && (
                  <Alert className="border-green-500 bg-green-500/10">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <AlertTitle className="text-green-600">Preview Complete - Ready to Import!</AlertTitle>
                    <AlertDescription>
                      ✅ {result.created} products validated successfully. 
                      <strong> Scroll up and click the green &quot;Import Products Now&quot; button</strong> to 
                      save them to your store.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Instructions Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Expected Format</CardTitle>
              <CardDescription>
                Your Excel file should have these columns:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">Item Lookup Code</span>
                  <Badge variant="destructive" className="text-xs">Required</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Description</span>
                  <Badge variant="destructive" className="text-xs">Required</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Price</span>
                  <Badge variant="destructive" className="text-xs">Required</Badge>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Extended Description</span>
                  <span className="text-xs">Optional</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Sub Description 1</span>
                  <span className="text-xs">Brand</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Sub Description 2</span>
                  <span className="text-xs">Optional</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Sub Description 3</span>
                  <span className="text-xs">Model</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Cost</span>
                  <span className="text-xs">Cost Price</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Qty On Hand</span>
                  <span className="text-xs">Stock</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Available Quantity</span>
                  <span className="text-xs">Stock</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Departments</span>
                  <span className="text-xs">Category</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Import Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-500 shrink-0" />
                  <span>Item Lookup Code becomes the product SKU</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-500 shrink-0" />
                  <span>Products with existing SKU will be updated</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-500 shrink-0" />
                  <span>New products are created as &quot;active&quot;</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-500 shrink-0" />
                  <span>Departments column sets the category</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 text-yellow-500 shrink-0" />
                  <span>Rows with invalid price are skipped</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 text-yellow-500 shrink-0" />
                  <span>Always preview before final import</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
