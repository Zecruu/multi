#!/usr/bin/env node
/**
 * Best-effort classifier: assigns every product to one of the new
 * nav subcategory slugs, and — when possible — a brand subcategory too.
 *
 * Writes both `category` (single, for legacy UI) and `categories` (array,
 * used by the storefront filter).
 *
 * Usage:
 *   node scripts/categorize-products.js [--dry-run]
 */
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const DRY = process.argv.includes("--dry-run");

const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    let [, k, v] = m;
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}

// Map existing product.category strings → new subcategory slug.
// Keys are lowercased + trimmed. Unknown values fall back to UNKNOWN_DEFAULT.
const CATEGORY_MAP = {
  "uncategorized": "wiring-and-cable",
  "satco": "lighting",
  "tornilleria": "tool-accessories",
  "wiring devices": "wiring-and-cable",
  "emt": "conduit-and-fittings",
  "iluminacion": "lighting",
  "pvc": "conduit-and-fittings",
  "ge": "panels-and-breakers",
  "cableria": "wiring-and-cable",
  "gb": "tool-accessories",
  "breaker no ge": "panels-and-breakers",
  "contactores": "panels-and-breakers",
  "wiremold": "conduit-and-fittings",
  "rigido": "conduit-and-fittings",
  "green/klein": "hand-tools",
  "ahdesivos": "tool-accessories",
  "leviton": "wiring-and-cable",
  "material linea": "wiring-and-cable",
  "transfer": "panels-and-breakers",
  "milwaukee": "power-tools-and-testers",
  "3m": "tool-accessories",
  "limpieza": "tool-accessories",
  "poleline": "wiring-and-cable",
  "fusibles": "panels-and-breakers",
  "piscina": "wiring-and-cable",
  "non-stock item": "wiring-and-cable",
};
const UNKNOWN_DEFAULT = "wiring-and-cable";

// Brand → nav brand subcategory slug. Matched case-insensitively on
// product.brand AND product.category strings.
const BRAND_MAP = {
  "klein": "klein-tools",
  "klein tools": "klein-tools",
  "green/klein": "klein-tools",
  "southwire": "southwire",
  "hubbell": "hubbell",
  "leviton": "leviton",
  "square d": "square-d",
};

function brandSlug(val) {
  if (!val) return null;
  const k = String(val).toLowerCase().trim();
  if (BRAND_MAP[k]) return BRAND_MAP[k];
  // Partial match (many "brand" values are SKU gibberish — only flag obvious hits)
  for (const key of Object.keys(BRAND_MAP)) {
    if (k.includes(key)) return BRAND_MAP[key];
  }
  return null;
}

function mapCategory(raw) {
  if (!raw) return UNKNOWN_DEFAULT;
  const k = String(raw).toLowerCase().trim();
  return CATEGORY_MAP[k] || UNKNOWN_DEFAULT;
}

(async () => {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI missing");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const Products = db.collection("products");

  const cursor = Products.find({}, { projection: { category: 1, brand: 1 } });
  let total = 0;
  let updated = 0;
  const bulk = [];
  const counts = {};

  for await (const p of cursor) {
    total++;
    const newCat = mapCategory(p.category);
    const brandChild = brandSlug(p.brand) || brandSlug(p.category);

    const cats = new Set([newCat]);
    if (brandChild) cats.add(brandChild);

    const catsArr = Array.from(cats);
    counts[newCat] = (counts[newCat] || 0) + 1;
    if (brandChild) counts[brandChild] = (counts[brandChild] || 0) + 1;

    bulk.push({
      updateOne: {
        filter: { _id: p._id },
        update: { $set: { category: newCat, categories: catsArr } },
      },
    });
    updated++;

    if (bulk.length >= 500) {
      if (!DRY) await Products.bulkWrite(bulk, { ordered: false });
      bulk.length = 0;
    }
  }

  if (bulk.length > 0 && !DRY) {
    await Products.bulkWrite(bulk, { ordered: false });
  }

  console.log(`\nProcessed: ${total}  ${DRY ? "(dry-run, nothing written)" : `Updated: ${updated}`}`);
  console.log("\nNew category distribution (counting multi-tags):");
  for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(v).padStart(5)}  ${k}`);
  }

  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
