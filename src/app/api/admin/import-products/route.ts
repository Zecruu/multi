import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as XLSX from "xlsx";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";
import { logImportRun } from "@/lib/import-run-logger";
import { processImportRows, ImportRow } from "@/lib/import-row-processor";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

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

interface ImportResult {
  success: boolean;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; sku: string; error: string }>;
  products?: Array<{
    sku: string;
    name: string;
    category: string;
    isNew: boolean;
  }>;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const adminUser = await getAdminUser();
    if (!adminUser) {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const dryRun = formData.get("dryRun") === "true";

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".xls") && !fileName.endsWith(".xlsx")) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload an Excel file (.xls or .xlsx)" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const data = new Uint8Array(buffer);

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

    await connectDB();

    const startedAt = new Date();

    // Shared row processor — non-destructive $set/$setOnInsert split,
    // category mapping, needsAiCategorize flagging. Same code path the
    // sync-agent endpoint uses.
    const { bulkOps, opMeta, errors, skipped, newSkuNeedsAiCategorize } =
      processImportRows(rows);

    const result: ImportResult = {
      success: true,
      created: 0,
      updated: 0,
      skipped,
      errors,
      products: dryRun ? [] : undefined,
    };

    const skuActions: Array<{
      sku: string;
      name?: string;
      action: "created" | "updated" | "unchanged";
      category?: string;
      needsAiCategorize?: boolean;
    }> = [];

    if (dryRun) {
      result.products = opMeta.map((m) => ({
        sku: m.sku,
        name: m.name,
        category: m.category,
        isNew: true, // dry run can't distinguish without a DB hit
      }));
      result.created = opMeta.length;
    } else if (bulkOps.length > 0) {
      console.log(`[Import] Executing ${bulkOps.length} bulk operations...`);

      try {
        const batchSize = 500;
        const totalBatches = Math.ceil(bulkOps.length / batchSize);
        console.log(`[Import] Will process ${totalBatches} batches of up to ${batchSize}`);

        for (let i = 0; i < bulkOps.length; i += batchSize) {
          const batch = bulkOps.slice(i, i + batchSize);
          const batchMeta = opMeta.slice(i, i + batchSize);
          const batchNum = Math.floor(i / batchSize) + 1;

          const startTime = Date.now();
          try {
            const bulkResult = await Product.bulkWrite(batch, { ordered: false });
            const created = bulkResult.upsertedCount || 0;
            const updated = bulkResult.modifiedCount || 0;
            result.created += created;
            result.updated += updated;

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
            console.log(
              `[Import] Batch ${batchNum}/${totalBatches} complete in ${elapsed}ms: created=${created}, updated=${updated}`
            );
          } catch (batchError: unknown) {
            const err = batchError as {
              message?: string;
              result?: {
                upsertedCount?: number;
                nUpserted?: number;
                modifiedCount?: number;
                nModified?: number;
                writeErrors?: Array<{
                  err?: { code?: number; errmsg?: string; keyValue?: { sku?: string; slug?: string } };
                  op?: { updateOne?: { filter?: { sku?: string } } };
                  code?: number;
                  errmsg?: string;
                }>;
              };
              writeErrors?: Array<unknown>;
            };
            const elapsed = Date.now() - startTime;
            console.error(`[Import] Batch ${batchNum} error after ${elapsed}ms:`, err.message);

            if (err.result) {
              const partialCreated = err.result.upsertedCount ?? err.result.nUpserted ?? 0;
              const partialUpdated = err.result.modifiedCount ?? err.result.nModified ?? 0;
              result.created += partialCreated;
              result.updated += partialUpdated;
            }

            const writeErrors = err.writeErrors || err.result?.writeErrors || [];
            const MAX_PER_BATCH = 20;
            for (let e = 0; e < Math.min(writeErrors.length, MAX_PER_BATCH); e++) {
              const we = writeErrors[e] as {
                err?: { code?: number; errmsg?: string; keyValue?: { sku?: string; slug?: string } };
                op?: { updateOne?: { filter?: { sku?: string } } };
                code?: number;
                errmsg?: string;
              };
              const errSku =
                we.op?.updateOne?.filter?.sku ||
                we.err?.keyValue?.sku ||
                we.err?.keyValue?.slug ||
                "UNKNOWN";
              const errCode = we.err?.code ?? we.code ?? 0;
              const errMsg = we.err?.errmsg ?? we.errmsg ?? "Write error";
              result.errors.push({
                row: 0,
                sku: errSku,
                error: `[${errCode}] ${errMsg.substring(0, 100)}`,
              });
            }
            if (writeErrors.length > MAX_PER_BATCH) {
              result.errors.push({
                row: 0,
                sku: "BATCH",
                error: `...and ${writeErrors.length - MAX_PER_BATCH} more errors`,
              });
            }
          }
        }

        console.log(
          `[Import] Final: ${result.created} created, ${result.updated} updated, ${result.errors.length} errors`
        );
      } catch (bulkError: unknown) {
        console.error("[Import] Critical bulk write error:", bulkError);
        result.errors.push({
          row: 0,
          sku: "SYSTEM",
          error: `Critical database error: ${(bulkError as Error).message}`,
        });
        result.success = false;
      }
    }

    if (result.errors.length > rows.length * 0.5) {
      result.success = false;
    }

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
        : `Import complete: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped` +
          (newSkuNeedsAiCategorize > 0
            ? `. ${newSkuNeedsAiCategorize} new product${
                newSkuNeedsAiCategorize === 1 ? "" : "s"
              } need AI categorization (ask Sparky to "categorize pending").`
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

export async function GET(_request: NextRequest): Promise<NextResponse> {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return NextResponse.json(
      { error: "Unauthorized. Admin access required." },
      { status: 401 }
    );
  }

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
      "Products with matching SKU will be updated non-destructively (admin edits preserved)",
      "Unmapped categories are flagged for Sparky AI categorization",
    ],
  });
}
