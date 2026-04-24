import { buildCategories, hasKnownMapping } from "@/lib/category-mapper";

export interface ImportRow {
  [key: string]: unknown;
}

export interface ImportBulkOp {
  updateOne: {
    filter: { sku: string };
    update: {
      $set: Record<string, unknown>;
      $setOnInsert: Record<string, unknown>;
    };
    upsert: boolean;
  };
}

export interface ImportOpMeta {
  sku: string;
  name: string;
  category: string;
  needsAiCategorize: boolean;
}

export interface ImportRowError {
  row: number;
  sku: string;
  error: string;
}

export interface ProcessedRows {
  bulkOps: ImportBulkOp[];
  opMeta: ImportOpMeta[];
  errors: ImportRowError[];
  skipped: number;
  newSkuNeedsAiCategorize: number;
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "" || value === "No") {
    return null;
  }
  const num =
    typeof value === "string"
      ? parseFloat(value.replace(/[^0-9.-]/g, ""))
      : Number(value);
  return isNaN(num) ? null : num;
}

function cleanString(value: unknown): string {
  if (value === null || value === undefined || value === "No") return "";
  return String(value).trim();
}

function generateSlug(sku: string): string {
  const slug = sku
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug || `product-${Date.now()}`;
}

function cleanSku(lookupCode: string): string {
  let sku = lookupCode.trim().replace(/^\+\s*/, "");
  sku = sku.replace(/\s+/g, "-").toUpperCase();
  sku = sku.replace(/[^A-Z0-9\-\/]/g, "");
  return sku || `SKU-${Date.now()}`;
}

function getField(row: ImportRow, ...names: string[]): unknown {
  for (const n of names) {
    if (row[n] !== undefined && row[n] !== "") return row[n];
  }
  return "";
}

/**
 * Parse RMS export rows into non-destructive bulk upsert ops.
 *
 * The RMS is source of truth for price / cost / quantity — those are in $set
 * and get refreshed every import. Everything else (name, category, images,
 * admin toggles like isFeatured/status) only writes via $setOnInsert so
 * admin edits to existing products survive daily syncs.
 *
 * Rows whose Department isn't in the taxonomy mapper are flagged
 * needsAiCategorize=true so Sparky picks them up later.
 */
export function processImportRows(rows: ImportRow[]): ProcessedRows {
  const bulkOps: ImportBulkOp[] = [];
  const opMeta: ImportOpMeta[] = [];
  const errors: ImportRowError[] = [];
  let skipped = 0;
  let newSkuNeedsAiCategorize = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // +1 for header, +1 for 1-indexed

    try {
      const lookupCode = cleanString(
        getField(row, "Item Lookup Code", "ItemLookupCode", "SKU", "Code")
      );
      const description = cleanString(
        getField(row, "Description", "Name", "Product Name")
      );

      if (!lookupCode || !description) {
        skipped++;
        if (lookupCode || description) {
          errors.push({
            row: rowNum,
            sku: lookupCode || "UNKNOWN",
            error: "Missing required field (Item Lookup Code or Description)",
          });
        }
        continue;
      }

      const price = parseNumber(
        getField(row, "Price", "SalePrice", "Retail")
      );
      if (price === null || price <= 0) {
        errors.push({
          row: rowNum,
          sku: lookupCode,
          error: `Invalid price: ${row["Price"] ?? ""}`,
        });
        skipped++;
        continue;
      }

      const extendedDescription = cleanString(
        getField(row, "Extended Description", "ExtendedDescription", "Long Description")
      );
      const subDesc1 = cleanString(
        getField(row, "Sub Description 1", "SubDescription1", "Brand")
      );
      const subDesc2 = cleanString(
        getField(row, "Sub Description 2", "SubDescription2")
      );
      const subDesc3 = cleanString(
        getField(row, "Sub Description 3", "SubDescription3", "Model")
      );
      const cost = parseNumber(getField(row, "Cost", "CostPrice"));
      const qtyOnHand = parseNumber(
        getField(row, "Qty On Hand", "QtyOnHand", "Stock")
      );
      const availableQty = parseNumber(
        getField(row, "Available Quantity", "AvailableQuantity", "Available")
      );
      const department = cleanString(
        getField(row, "Departments", "Department", "Category")
      );

      const sku = cleanSku(lookupCode);
      const name = description.substring(0, 200);
      const slug = generateSlug(sku);
      const quantity = Math.max(0, availableQty ?? qtyOnHand ?? 0);

      const specifications: Record<string, string> = {};
      if (subDesc2) specifications["attribute1"] = subDesc2;
      if (subDesc3) specifications["model"] = subDesc3;

      const { primary: mappedCategory, categories: mappedCategories } =
        buildCategories(department, subDesc1);
      const isMapped = hasKnownMapping(department);
      if (department && !isMapped) newSkuNeedsAiCategorize++;

      const alwaysSet: Record<string, unknown> = {
        price,
        costPrice: cost || undefined,
        quantity,
      };

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
        needsAiCategorize: !isMapped,
        rmsDepartment: department || null,
      };

      bulkOps.push({
        updateOne: {
          filter: { sku },
          update: { $set: alwaysSet, $setOnInsert: onInsert },
          upsert: true,
        },
      });
      opMeta.push({
        sku,
        name,
        category: mappedCategory,
        needsAiCategorize: !isMapped,
      });
    } catch (err) {
      errors.push({
        row: rowNum,
        sku: "UNKNOWN",
        error: err instanceof Error ? err.message : String(err),
      });
      skipped++;
    }
  }

  return { bulkOps, opMeta, errors, skipped, newSkuNeedsAiCategorize };
}
