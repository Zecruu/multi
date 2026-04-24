import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as XLSX from "xlsx";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";
import { buildCategories, hasKnownMapping } from "@/lib/category-mapper";
import { logImportRun } from "@/lib/import-run-logger";

// Route segment config - extend timeout for large imports
export const maxDuration = 60; // 60 seconds (max for Vercel Pro)
export const dynamic = "force-dynamic";

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Helper to get admin user from session
async function getAdminUser() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("admin_session");
  if (!sessionCookie) return null;

  try {
    const sessionData = JSON.parse(
      Buffer.from(sessionCookie.value, "base64").toString()
    );
    return {
      name: sessionData.name || sessionData.username || "Admin",
      role: sessionData.role || "admin",
    };
  } catch {
    return null;
  }
}

// Clean and parse numeric values
function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "" || value === "No") {
    return null;
  }
  const num = typeof value === "string" ? parseFloat(value.replace(/[^0-9.-]/g, "")) : Number(value);
  return isNaN(num) ? null : num;
}

// Clean string values
function cleanString(value: unknown): string {
  if (value === null || value === undefined || value === "No") {
    return "";
  }
  return String(value).trim();
}

// Generate slug from SKU only to ensure uniqueness (since SKU is unique)
function generateSlug(sku: string): string {
  // Use SKU as the primary slug source since it's guaranteed unique
  const skuSlug = sku
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  
  return skuSlug || `product-${Date.now()}`;
}

// Clean SKU - remove special characters but keep identifier unique
function cleanSku(lookupCode: string): string {
  // Remove leading + or whitespace, but keep the rest intact
  let sku = lookupCode.trim().replace(/^\+\s*/, "");
  // Replace spaces and special chars with dashes, uppercase
  sku = sku.replace(/\s+/g, "-").toUpperCase();
  // Remove any characters that aren't alphanumeric, dash, or slash
  sku = sku.replace(/[^A-Z0-9\-\/]/g, "");
  return sku || `SKU-${Date.now()}`;
}

interface ImportRow {
  "Item Lookup Code"?: string;
  Description?: string;
  "Extended Description"?: string;
  "Sub Description 1"?: string;
  "Sub Description 2"?: string;
  "Sub Description 3"?: string;
  Cost?: number | string;
  Price?: number | string;
  "Qty On Hand"?: number | string;
  "Available Quantity"?: number | string;
  Departments?: string;
  // Also handle potential column index access
  [key: string]: unknown;
}

interface ImportResult {
  success: boolean;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; sku: string; error: string }>;
  products?: Array<{
    sku: string;
    name: string;
    price: number;
    quantity: number;
    category: string;
    isNew: boolean;
  }>;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check admin authentication
    const adminUser = await getAdminUser();
    if (!adminUser) {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const dryRun = formData.get("dryRun") === "true";

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/octet-stream", // Some browsers send this
    ];
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".xls") && !fileName.endsWith(".xlsx")) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload an Excel file (.xls or .xlsx)" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    // Read file buffer
    const buffer = await file.arrayBuffer();
    const data = new Uint8Array(buffer);

    // Parse Excel file
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(data, { type: "array" });
    } catch (parseError) {
      console.error("Excel parse error:", parseError);
      return NextResponse.json(
        { error: "Failed to parse Excel file. Please ensure it's a valid Excel file." },
        { status: 400 }
      );
    }

    // Get the first sheet (Sheet1 or first available)
    const sheetName = workbook.SheetNames.includes("Sheet1") 
      ? "Sheet1" 
      : workbook.SheetNames[0];
    
    if (!sheetName) {
      return NextResponse.json(
        { error: "No sheets found in the Excel file" },
        { status: 400 }
      );
    }

    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON with headers
    const rows: ImportRow[] = XLSX.utils.sheet_to_json(worksheet, {
      defval: "",
      raw: false,
    });

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No data found in the Excel file" },
        { status: 400 }
      );
    }

    console.log(`[Import] Processing ${rows.length} rows from sheet "${sheetName}"`);
    console.log(`[Import] Sample row keys:`, Object.keys(rows[0] || {}));
    console.log(`[Import] Sample row data:`, JSON.stringify(rows[0], null, 2));

    // Connect to database
    await connectDB();

    const result: ImportResult = {
      success: true,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      products: dryRun ? [] : undefined,
    };

    // Process each row.
    // Non-destructive strategy:
    //   $set            — fields that reflect daily truth from the RMS
    //                     (price, costPrice, quantity). Always applied.
    //   $setOnInsert    — fields that should only be populated for brand-new
    //                     SKUs, so admin edits to existing products survive
    //                     (name, description, category, images, status, etc).
    // If the vendor department isn't in our taxonomy, the product lands in
    // "uncategorized" and is picked up later by the AI categorizer.
    const bulkOps: Array<{
      updateOne: {
        filter: { sku: string };
        update: {
          $set: Record<string, unknown>;
          $setOnInsert?: Record<string, unknown>;
        };
        upsert: boolean;
      };
    }> = [];
    // Track per-op metadata so we can resolve SKU → action after bulkWrite.
    const opMeta: Array<{
      sku: string;
      name: string;
      category: string;
      needsAiCategorize: boolean;
    }> = [];
    const startedAt = new Date();
    let newSkuNeedsAiCategorize = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 because row 1 is header, array is 0-indexed

      try {
        // Extract data with flexible column names (handle variations)
        const lookupCode = cleanString(
          row["Item Lookup Code"] || row["ItemLookupCode"] || row["SKU"] || row["Code"] || ""
        );
        const description = cleanString(
          row["Description"] || row["Name"] || row["Product Name"] || ""
        );
        const extendedDescription = cleanString(
          row["Extended Description"] || row["ExtendedDescription"] || row["Long Description"] || ""
        );
        const subDesc1 = cleanString(
          row["Sub Description 1"] || row["SubDescription1"] || row["Brand"] || ""
        );
        const subDesc2 = cleanString(
          row["Sub Description 2"] || row["SubDescription2"] || ""
        );
        const subDesc3 = cleanString(
          row["Sub Description 3"] || row["SubDescription3"] || row["Model"] || ""
        );
        const cost = parseNumber(row["Cost"] || row["CostPrice"]);
        const price = parseNumber(row["Price"] || row["SalePrice"] || row["Retail"]);
        const qtyOnHand = parseNumber(row["Qty On Hand"] || row["QtyOnHand"] || row["Stock"]);
        const availableQty = parseNumber(
          row["Available Quantity"] || row["AvailableQuantity"] || row["Available"] || qtyOnHand
        );
        const department = cleanString(
          row["Departments"] || row["Department"] || row["Category"] || ""
        );

        // Skip rows without required data
        if (!lookupCode || !description) {
          result.skipped++;
          if (lookupCode || description) {
            result.errors.push({
              row: rowNum,
              sku: lookupCode || "UNKNOWN",
              error: "Missing required field (Item Lookup Code or Description)",
            });
          }
          continue;
        }

        // Validate price
        if (price === null || price <= 0) {
          result.errors.push({
            row: rowNum,
            sku: lookupCode,
            error: `Invalid price: ${row["Price"]}`,
          });
          result.skipped++;
          continue;
        }

        // Clean SKU
        const sku = cleanSku(lookupCode);

        // Generate product name from description
        const name = description.substring(0, 200); // Limit name length

        // Generate unique slug from SKU (guaranteed unique since SKU is unique)
        const slug = generateSlug(sku);
        
        // Build specifications - will be converted to Map by mongoose
        const specifications: Record<string, string> = {};
        if (subDesc2) specifications["attribute1"] = subDesc2;
        if (subDesc3) specifications["model"] = subDesc3;
        
        // Map the RMS "Departments" value to our nav taxonomy slug.
        const { primary: mappedCategory, categories: mappedCategories } =
          buildCategories(department, subDesc1);
        if (department && !hasKnownMapping(department)) newSkuNeedsAiCategorize++;

        // Fields refreshed on every import — the RMS is source of truth for
        // stock and price.
        const alwaysSet: Record<string, unknown> = {
          price,
          costPrice: cost || undefined,
          quantity: Math.max(0, availableQty ?? qtyOnHand ?? 0),
        };

        // Fields written only when the product is brand new. Protects admin
        // edits (category changes, images, description tweaks, archived
        // status, on-sale settings) from being wiped every day.
        const onInsert: Record<string, unknown> = {
          name,
          slug,
          sku,
          description: extendedDescription || description,
          descriptionEs: "",
          shortDescription: description.substring(0, 160),
          category: mappedCategory,
          categories: mappedCategories,
          subcategory: subDesc1 || undefined,
          brand: subDesc1 || undefined,
          lowStockThreshold: 10,
          unit: "piece",
          status: "active" as const,
          isFeatured: false,
          images: [],
          specifications:
            Object.keys(specifications).length > 0 ? specifications : undefined,
          tags: [department, subDesc1, subDesc2, subDesc3].filter(Boolean),
          // Tag unmapped imports so the AI categorizer can find them later.
          needsAiCategorize: !hasKnownMapping(department),
          rmsDepartment: department || null,
        };

        if (dryRun) {
          // For dry run, just collect the data
          result.products?.push({
            sku,
            name,
            price,
            quantity: Math.max(0, availableQty ?? qtyOnHand ?? 0),
            category: mappedCategory,
            isNew: true, // Will be determined in actual import
          });
        } else {
          bulkOps.push({
            updateOne: {
              filter: { sku },
              update: {
                $set: alwaysSet,
                $setOnInsert: onInsert,
              },
              upsert: true,
            },
          });
          opMeta.push({
            sku,
            name,
            category: mappedCategory,
            needsAiCategorize: !hasKnownMapping(department),
          });
        }
      } catch (rowError) {
        console.error(`[Import] Error processing row ${rowNum}:`, rowError);
        result.errors.push({
          row: rowNum,
          sku: cleanString(row["Item Lookup Code"]) || "UNKNOWN",
          error: rowError instanceof Error ? rowError.message : "Unknown error",
        });
        result.skipped++;
      }
    }

    // Per-SKU actions, populated as bulk batches resolve.
    const skuActions: Array<{
      sku: string;
      name?: string;
      action: "created" | "updated" | "unchanged";
      category?: string;
      needsAiCategorize?: boolean;
    }> = [];

    // Execute bulk operations if not dry run
    if (!dryRun && bulkOps.length > 0) {
      console.log(`[Import] Executing ${bulkOps.length} bulk operations...`);

      try {
        // Use larger batches for efficiency - MongoDB can handle 1000+ ops
        // but keep it at 500 for memory safety
        const batchSize = 500;
        const totalBatches = Math.ceil(bulkOps.length / batchSize);

        console.log(`[Import] Will process ${totalBatches} batches of up to ${batchSize} items`);

        for (let i = 0; i < bulkOps.length; i += batchSize) {
          const batch = bulkOps.slice(i, i + batchSize);
          const batchMeta = opMeta.slice(i, i + batchSize);
          const batchNum = Math.floor(i/batchSize) + 1;
          console.log(`[Import] Processing batch ${batchNum}/${totalBatches} (${batch.length} items)`);

          const startTime = Date.now();

          try {
            // Use ordered: false to continue on errors, skip validation for speed
            const bulkResult = await Product.bulkWrite(batch, {
              ordered: false,
            });

            const created = bulkResult.upsertedCount || 0;
            const updated = bulkResult.modifiedCount || 0;
            const matched = bulkResult.matchedCount || 0;

            result.created += created;
            result.updated += updated;

            // upsertedIds maps local-batch index → newly-created ObjectId.
            const upsertedIdx = new Set<number>(
              Object.keys(bulkResult.upsertedIds || {}).map((k) => Number(k))
            );
            for (let j = 0; j < batchMeta.length; j++) {
              const meta = batchMeta[j];
              skuActions.push({
                sku: meta.sku,
                name: meta.name,
                action: upsertedIdx.has(j) ? "created" : "updated",
                category: meta.category,
                needsAiCategorize: meta.needsAiCategorize,
              });
            }
            
            const elapsed = Date.now() - startTime;
            console.log(`[Import] Batch ${batchNum} complete in ${elapsed}ms: created=${created}, updated=${updated}, matched=${matched}`);
          } catch (batchError: any) {
            const elapsed = Date.now() - startTime;
            console.error(`[Import] Batch ${batchNum} error after ${elapsed}ms:`, batchError.message);
            
            // BulkWriteError contains partial results
            if (batchError.result) {
              const partialCreated = batchError.result.nUpserted || batchError.result.upsertedCount || 0;
              const partialUpdated = batchError.result.nModified || batchError.result.modifiedCount || 0;
              result.created += partialCreated;
              result.updated += partialUpdated;
              console.log(`[Import] Partial success in batch ${batchNum}: created=${partialCreated}, updated=${partialUpdated}`);
            }
            
            // Handle individual write errors - limit to prevent memory issues
            const writeErrors = batchError.writeErrors || batchError.result?.writeErrors || [];
            const maxErrors = 20; // Only log first 20 errors per batch
            
            for (let e = 0; e < Math.min(writeErrors.length, maxErrors); e++) {
              const writeError = writeErrors[e];
              const errorOp = writeError.err?.op || writeError.op || {};
              const errorSku = errorOp?.updateOne?.filter?.sku || 
                              writeError.err?.keyValue?.sku ||
                              writeError.err?.keyValue?.slug ||
                              "UNKNOWN";
              const errorCode = writeError.err?.code || writeError.code || 0;
              const errorMsg = writeError.err?.errmsg || writeError.err?.message || writeError.errmsg || "Write error";
              
              result.errors.push({
                row: 0,
                sku: errorSku,
                error: `[${errorCode}] ${errorMsg.substring(0, 100)}`,
              });
            }
            
            if (writeErrors.length > maxErrors) {
              result.errors.push({
                row: 0,
                sku: "BATCH",
                error: `...and ${writeErrors.length - maxErrors} more errors in this batch`,
              });
            }
          }
        }

        console.log(`[Import] Final result: ${result.created} created, ${result.updated} updated, ${result.errors.length} errors`);
      } catch (bulkError: any) {
        console.error("[Import] Critical bulk write error:", bulkError);
        result.errors.push({
          row: 0,
          sku: "SYSTEM",
          error: `Critical database error: ${bulkError.message}`,
        });
        result.success = false;
      }
    }

    // If dry run, count as if they would be created
    if (dryRun) {
      result.created = result.products?.length || 0;
    }

    // Mark as failed if too many errors
    if (result.errors.length > rows.length * 0.5) {
      result.success = false;
    }

    // Persist the import run (fire-and-forget — never block the response).
    if (!dryRun) {
      await logImportRun({
        source: "admin-ui",
        adminUserName: adminUser.name,
        fileName: file.name,
        fileSize: file.size,
        totalRows: rows.length,
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
        pendingAiCategorize: newSkuNeedsAiCategorize,
        errors: result.errors,
        products: skuActions,
        startedAt,
      });
    }

    return NextResponse.json({
      success: result.success,
      message: dryRun
        ? `Preview: ${result.created} products would be imported`
        : `Import complete: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped`
          + (newSkuNeedsAiCategorize > 0
              ? `. ${newSkuNeedsAiCategorize} new product${newSkuNeedsAiCategorize === 1 ? "" : "s"} need AI categorization (ask Sparky to "categorize pending").`
              : ""),
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      totalRows: rows.length,
      pendingAiCategorize: newSkuNeedsAiCategorize,
      errors: result.errors.slice(0, 50),
      totalErrors: result.errors.length,
      products: result.products?.slice(0, 100),
      importedBy: adminUser.name,
      timestamp: new Date().toISOString(),
      detectedColumns: Object.keys(rows[0] || {}),
      sampleRow: rows[0] ? JSON.stringify(rows[0]).substring(0, 500) : null,
    });

  } catch (error) {
    console.error("[Import] Error:", error);
    return NextResponse.json(
      { 
        error: "Failed to import products",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check import status or get template
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Check admin authentication
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return NextResponse.json(
      { error: "Unauthorized. Admin access required." },
      { status: 401 }
    );
  }

  // Return expected column format
  return NextResponse.json({
    expectedColumns: [
      "Item Lookup Code",
      "Description",
      "Extended Description",
      "Sub Description 1",
      "Sub Description 2", 
      "Sub Description 3",
      "Cost",
      "Price",
      "Qty On Hand",
      "Available Quantity",
      "Departments",
    ],
    maxFileSize: "10MB",
    supportedFormats: [".xls", ".xlsx"],
    notes: [
      "Item Lookup Code will be used as SKU (required)",
      "Description will be used as product name (required)",
      "Price is required and must be greater than 0",
      "Products with matching SKU will be updated",
      "New products will be created with 'active' status",
    ],
  });
}
