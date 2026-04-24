import Product from "@/models/Product";
import type {
  ImportBulkOp,
  ImportOpMeta,
} from "@/lib/import-row-processor";

/**
 * Separate import bulk ops into ones that would actually change the DB
 * vs. ones that are no-ops against existing products.
 *
 * Why: with Mongoose `timestamps: true`, every bulkWrite op bumps
 * updatedAt — which MongoDB counts as a modification. So a sync that
 * changed nothing would still report ~4000 "updated" rows. Filtering
 * these out up front gives honest counts AND cuts write volume to just
 * the rows that moved.
 */
export async function filterUnchangedOps(
  bulkOps: ImportBulkOp[],
  opMeta: ImportOpMeta[]
): Promise<{
  filteredOps: ImportBulkOp[];
  filteredMeta: ImportOpMeta[];
  unchangedSkus: string[];
}> {
  if (bulkOps.length === 0) {
    return { filteredOps: [], filteredMeta: [], unchangedSkus: [] };
  }

  const skus = opMeta.map((m) => m.sku);
  const existing = await Product.find({ sku: { $in: skus } })
    .select("sku price costPrice quantity")
    .lean();
  const map = new Map<
    string,
    { price?: number; costPrice?: number | null; quantity?: number }
  >(existing.map((d) => [d.sku, d]));

  const filteredOps: ImportBulkOp[] = [];
  const filteredMeta: ImportOpMeta[] = [];
  const unchangedSkus: string[] = [];

  for (let i = 0; i < bulkOps.length; i++) {
    const op = bulkOps[i];
    const meta = opMeta[i];
    const next = op.updateOne.update.$set;
    const existingDoc = map.get(meta.sku);

    // New SKU → always include (upsert will create it).
    if (!existingDoc) {
      filteredOps.push(op);
      filteredMeta.push(meta);
      continue;
    }

    const priceEq =
      normalizeNumber(existingDoc.price) === normalizeNumber(next.price);
    const costEq =
      normalizeNumber(existingDoc.costPrice) ===
      normalizeNumber(next.costPrice);
    const qtyEq =
      normalizeNumber(existingDoc.quantity) ===
      normalizeNumber(next.quantity);

    if (priceEq && costEq && qtyEq) {
      unchangedSkus.push(meta.sku);
      continue;
    }

    filteredOps.push(op);
    filteredMeta.push(meta);
  }

  return { filteredOps, filteredMeta, unchangedSkus };
}

function normalizeNumber(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}
