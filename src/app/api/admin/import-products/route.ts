import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as XLSX from "xlsx";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";

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

// Generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .substring(0, 100); // Limit slug length
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

    // Process each row
    const bulkOps: Array<{
      updateOne: {
        filter: { sku: string };
        update: { $set: Record<string, unknown> };
        upsert: boolean;
      };
    }> = [];

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

        // Generate slug
        let slug = generateSlug(name);
        
        // Build product data
        const productData = {
          name,
          slug,
          sku,
          description: extendedDescription || description,
          descriptionEs: "", // Can be populated later if Spanish text detected in extended description
          shortDescription: description.substring(0, 160),
          category: department || "Uncategorized",
          subcategory: subDesc1 || undefined,
          brand: subDesc1 || undefined,
          price: price,
          costPrice: cost || undefined,
          quantity: Math.max(0, availableQty ?? qtyOnHand ?? 0),
          lowStockThreshold: 10,
          unit: "piece",
          status: "active" as const,
          isFeatured: false,
          images: [],
          // Store additional metadata in specifications
          specifications: new Map<string, string>([
            ...(subDesc2 ? [["attribute1", subDesc2] as [string, string]] : []),
            ...(subDesc3 ? [["model", subDesc3] as [string, string]] : []),
          ]),
          tags: [department, subDesc1, subDesc2, subDesc3].filter(Boolean),
        };

        if (dryRun) {
          // For dry run, just collect the data
          result.products?.push({
            sku: productData.sku,
            name: productData.name,
            price: productData.price,
            quantity: productData.quantity,
            category: productData.category,
            isNew: true, // Will be determined in actual import
          });
        } else {
          // Add to bulk operations for actual import
          bulkOps.push({
            updateOne: {
              filter: { sku: productData.sku },
              update: { 
                $set: {
                  ...productData,
                  updatedAt: new Date(),
                },
                $setOnInsert: {
                  createdAt: new Date(),
                },
              } as any,
              upsert: true,
            },
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

    // Execute bulk operations if not dry run
    if (!dryRun && bulkOps.length > 0) {
      try {
        // Process in batches of 500 to avoid memory issues
        const batchSize = 500;
        for (let i = 0; i < bulkOps.length; i += batchSize) {
          const batch = bulkOps.slice(i, i + batchSize);
          const bulkResult = await Product.bulkWrite(batch, { ordered: false });
          
          result.created += bulkResult.upsertedCount;
          result.updated += bulkResult.modifiedCount;
        }

        console.log(`[Import] Completed: ${result.created} created, ${result.updated} updated`);
      } catch (bulkError: any) {
        console.error("[Import] Bulk write error:", bulkError);
        
        // Handle duplicate key errors gracefully
        if (bulkError.writeErrors) {
          for (const writeError of bulkError.writeErrors) {
            result.errors.push({
              row: 0,
              sku: writeError.err?.op?.updateOne?.filter?.sku || "UNKNOWN",
              error: writeError.err?.errmsg || "Database write error",
            });
          }
        }
        
        // Still count successes from partial write
        if (bulkError.result) {
          result.created += bulkError.result.nUpserted || 0;
          result.updated += bulkError.result.nModified || 0;
        }
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

    return NextResponse.json({
      success: result.success,
      message: dryRun 
        ? `Preview: ${result.created} products would be imported`
        : `Import complete: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped`,
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      totalRows: rows.length,
      errors: result.errors.slice(0, 50), // Limit errors in response
      totalErrors: result.errors.length,
      products: result.products?.slice(0, 100), // Limit preview products
      importedBy: adminUser.name,
      timestamp: new Date().toISOString(),
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
