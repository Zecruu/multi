import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";
import { headers } from "next/headers";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Sync key validation - stored in env
async function validateSyncKey(request: NextRequest): Promise<boolean> {
  const syncKey = request.headers.get("x-sync-key");
  if (!syncKey) return false;

  const validKey = process.env.SYNC_AGENT_KEY;
  if (!validKey) return false;

  return syncKey === validKey;
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "" || value === "No") return null;
  const num = typeof value === "string" ? parseFloat(value.replace(/[^0-9.-]/g, "")) : Number(value);
  return isNaN(num) ? null : num;
}

function cleanString(value: unknown): string {
  if (value === null || value === undefined || value === "No") return "";
  return String(value).trim();
}

function generateSlug(sku: string): string {
  const skuSlug = sku.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return skuSlug || `product-${Date.now()}`;
}

function cleanSku(lookupCode: string): string {
  let sku = lookupCode.trim().replace(/^\+\s*/, "");
  sku = sku.replace(/\s+/g, "-").toUpperCase();
  sku = sku.replace(/[^A-Z0-9\-\/]/g, "");
  return sku || `SKU-${Date.now()}`;
}

interface ImportRow {
  [key: string]: unknown;
}

export async function POST(request: NextRequest) {
  // Authenticate via sync key
  if (!(await validateSyncKey(request))) {
    return NextResponse.json({ error: "Invalid or missing sync key" }, { status: 401 });
  }

  const agentVersion = request.headers.get("x-agent-version") || "unknown";

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    const ext = file.name.toLowerCase().split(".").pop();
    if (!["xls", "xlsx"].includes(ext || "")) {
      return NextResponse.json({ error: "Invalid file type. Only .xls and .xlsx accepted" }, { status: 400 });
    }

    await connectDB();

    // Parse Excel file
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames.includes("Sheet1") ? "Sheet1" : workbook.SheetNames[0];

    if (!sheetName) {
      return NextResponse.json({ error: "No sheets found in workbook" }, { status: 400 });
    }

    const sheet = workbook.Sheets[sheetName];
    const rows: ImportRow[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    if (rows.length === 0) {
      return NextResponse.json({ error: "No data rows found" }, { status: 400 });
    }

    // Column name mapping (same as import-products)
    const getField = (row: ImportRow, ...names: string[]): unknown => {
      for (const name of names) {
        if (row[name] !== undefined && row[name] !== "") return row[name];
      }
      return "";
    };

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: Array<{ row: number; sku: string; error: string }> = [];
    const bulkOps: Array<{
      updateOne: {
        filter: { sku: string };
        update: { $set: Record<string, unknown> };
        upsert: boolean;
      };
    }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      try {
        const lookupCode = cleanString(getField(row, "Item Lookup Code", "ItemLookupCode", "SKU", "Code"));
        const description = cleanString(getField(row, "Description", "Name", "Product Name"));

        if (!lookupCode || !description) {
          skipped++;
          continue;
        }

        const sku = cleanSku(lookupCode);
        const price = parseNumber(getField(row, "Price", "SalePrice", "Retail"));

        if (price === null || price <= 0) {
          errors.push({ row: i + 2, sku, error: "Invalid or missing price" });
          skipped++;
          continue;
        }

        const extDesc = cleanString(getField(row, "Extended Description", "ExtendedDescription", "Long Description"));
        const subDesc1 = cleanString(getField(row, "Sub Description 1", "SubDescription1", "Brand"));
        const subDesc2 = cleanString(getField(row, "Sub Description 2", "SubDescription2"));
        const subDesc3 = cleanString(getField(row, "Sub Description 3", "SubDescription3", "Model"));
        const cost = parseNumber(getField(row, "Cost", "CostPrice"));
        const qtyOnHand = parseNumber(getField(row, "Qty On Hand", "QtyOnHand", "Stock"));
        const availQty = parseNumber(getField(row, "Available Quantity", "AvailableQuantity", "Available"));
        const department = cleanString(getField(row, "Departments", "Department", "Category"));

        const name = description.substring(0, 200);
        const quantity = Math.max(availQty || 0, qtyOnHand || 0, 0);

        const specs: Record<string, string> = {};
        if (subDesc2) specs.attribute1 = subDesc2;
        if (subDesc3) specs.model = subDesc3;

        const tags = [department, subDesc1, subDesc2, subDesc3].filter(Boolean);

        const productData: Record<string, unknown> = {
          name,
          slug: generateSlug(sku),
          sku,
          description: extDesc || description,
          shortDescription: description.substring(0, 160),
          category: department || "Uncategorized",
          subcategory: subDesc1 || undefined,
          brand: subDesc1 || undefined,
          price,
          costPrice: cost || undefined,
          quantity,
          lowStockThreshold: 10,
          unit: "piece",
          status: "active",
          isFeatured: false,
          specifications: specs,
          tags,
        };

        bulkOps.push({
          updateOne: {
            filter: { sku },
            update: { $set: productData },
            upsert: true,
          },
        });
      } catch (err) {
        errors.push({ row: i + 2, sku: "unknown", error: (err as Error).message });
      }
    }

    // Execute bulk operations in batches
    const BATCH_SIZE = 500;
    for (let i = 0; i < bulkOps.length; i += BATCH_SIZE) {
      const batch = bulkOps.slice(i, i + BATCH_SIZE);
      try {
        const result = await Product.bulkWrite(batch, { ordered: false });
        created += result.upsertedCount || 0;
        updated += result.modifiedCount || 0;
      } catch (err: unknown) {
        const bulkError = err as { result?: { nInserted?: number; nModified?: number } };
        if (bulkError.result) {
          created += bulkError.result.nInserted || 0;
          updated += bulkError.result.nModified || 0;
        }
        errors.push({ row: 0, sku: "batch", error: (err as Error).message });
      }
    }

    return NextResponse.json({
      success: errors.length < rows.length * 0.5,
      created,
      updated,
      skipped,
      totalRows: rows.length,
      totalErrors: errors.length,
      errors: errors.slice(0, 50),
      importedBy: `Sync Agent v${agentVersion}`,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Import failed", message: (err as Error).message },
      { status: 500 }
    );
  }
}
