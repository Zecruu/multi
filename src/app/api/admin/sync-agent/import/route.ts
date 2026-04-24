import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";
import { logImportRun } from "@/lib/import-run-logger";
import { processImportRows, ImportRow } from "@/lib/import-row-processor";
import { verifySyncKey } from "@/lib/sync-agent-key";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const providedKey = request.headers.get("x-sync-key");
  if (!(await verifySyncKey(providedKey))) {
    return NextResponse.json({ error: "Invalid or missing sync key" }, { status: 401 });
  }

  const agentVersion = request.headers.get("x-agent-version") || "unknown";
  const startedAt = new Date();

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
      return NextResponse.json(
        { error: "Invalid file type. Only .xls and .xlsx accepted" },
        { status: 400 }
      );
    }

    await connectDB();

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames.includes("Sheet1")
      ? "Sheet1"
      : workbook.SheetNames[0];

    if (!sheetName) {
      return NextResponse.json({ error: "No sheets found in workbook" }, { status: 400 });
    }

    const sheet = workbook.Sheets[sheetName];
    const rows: ImportRow[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    if (rows.length === 0) {
      return NextResponse.json({ error: "No data rows found" }, { status: 400 });
    }

    // Shared non-destructive row processor. Identical semantics to the
    // admin-UI upload endpoint: admin edits to existing products survive
    // daily syncs; unmapped departments flag needsAiCategorize=true so
    // Sparky can pick them up later.
    const { bulkOps, opMeta, errors, skipped, newSkuNeedsAiCategorize } =
      processImportRows(rows);

    let created = 0;
    let updated = 0;
    const skuActions: Array<{
      sku: string;
      name?: string;
      action: "created" | "updated" | "unchanged";
      category?: string;
      needsAiCategorize?: boolean;
    }> = [];

    const BATCH_SIZE = 500;
    for (let i = 0; i < bulkOps.length; i += BATCH_SIZE) {
      const batch = bulkOps.slice(i, i + BATCH_SIZE);
      const batchMeta = opMeta.slice(i, i + BATCH_SIZE);
      try {
        const result = await Product.bulkWrite(batch, { ordered: false });
        created += result.upsertedCount || 0;
        updated += result.modifiedCount || 0;

        const upsertedIdx = new Set<number>(
          Object.keys(result.upsertedIds || {}).map((k) => Number(k))
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
      } catch (err: unknown) {
        const bulkError = err as {
          result?: { nInserted?: number; nModified?: number; upsertedCount?: number; modifiedCount?: number };
        };
        if (bulkError.result) {
          created +=
            bulkError.result.upsertedCount ?? bulkError.result.nInserted ?? 0;
          updated +=
            bulkError.result.modifiedCount ?? bulkError.result.nModified ?? 0;
        }
        errors.push({ row: 0, sku: "batch", error: (err as Error).message });
      }
    }

    await logImportRun({
      source: "sync-agent",
      agentVersion,
      fileName: file.name,
      fileSize: file.size,
      totalRows: rows.length,
      created,
      updated,
      skipped,
      pendingAiCategorize: newSkuNeedsAiCategorize,
      errors,
      products: skuActions,
      startedAt,
    });

    return NextResponse.json({
      success: errors.length < rows.length * 0.5,
      created,
      updated,
      skipped,
      totalRows: rows.length,
      pendingAiCategorize: newSkuNeedsAiCategorize,
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
