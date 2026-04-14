#!/usr/bin/env node
/**
 * Seed/repair the storefront navigation category hierarchy.
 *
 * What it does:
 *   1. Loads MONGODB_URI from .env.local (or process.env).
 *   2. Deactivates EVERY existing category (isActive = false, parentId unchanged).
 *   3. Upserts the 3 parent buckets (Tools, All Products, Shop by Brand)
 *      as top-level (parentId = null), active.
 *   4. Upserts the defined subcategories with parentId pointing at the right parent,
 *      active.
 *
 * Existing imported categories that aren't in the spec remain in the DB
 * (so product `category` string assignments keep working) but stay inactive,
 * so they never appear in the nav.
 *
 * Usage:
 *   node scripts/seed-nav-categories.js [--dry-run]
 */

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const DRY_RUN = process.argv.includes("--dry-run");

function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    let [, key, val] = m;
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("✗ MONGODB_URI not set. Add it to .env.local and retry.");
  process.exit(1);
}

const CategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: String,
    icon: String,
    color: { type: String, default: "bg-blue-500/10 text-blue-500" },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Category =
  mongoose.models.Category || mongoose.model("Category", CategorySchema);

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const TREE = [
  {
    name: "Tools",
    children: [
      "Power Tools & Testers",
      "Hand Tools",
      "Cutters",
      "Fish Tapes",
      "Measuring Devices",
      "Tool Accessories",
      "Tool Kits",
      "Batteries & Chargers",
      "Testers",
    ],
  },
  {
    name: "All Products",
    children: [
      "Wiring & Cable",
      "Panels & Breakers",
      "Conduit & Fittings",
      "Lighting",
      "Safety & PPE",
    ],
  },
  {
    name: "Shop by Brand",
    children: ["Klein Tools", "Southwire", "Hubbell", "Leviton", "Square D"],
  },
];

async function upsert(filter, update) {
  if (DRY_RUN) {
    console.log("  [dry-run] upsert", filter, "→", update);
    return { _id: `dry-${filter.slug}` };
  }
  const doc = await Category.findOneAndUpdate(
    filter,
    { $set: update },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return doc;
}

(async () => {
  console.log(`Connecting to Mongo${DRY_RUN ? " [dry-run]" : ""}...`);
  await mongoose.connect(MONGODB_URI);
  console.log("✓ Connected");

  // 1. Deactivate everything currently in the DB.
  if (DRY_RUN) {
    const n = await Category.countDocuments();
    console.log(`  [dry-run] would deactivate ${n} existing categories`);
  } else {
    const res = await Category.updateMany({}, { $set: { isActive: false } });
    console.log(`✓ Deactivated ${res.modifiedCount} existing categories`);
  }

  // 2. Upsert parents.
  let parentSort = 0;
  const parentIdByName = {};
  for (const parent of TREE) {
    const slug = slugify(parent.name);
    const doc = await upsert(
      { slug },
      {
        name: parent.name,
        slug,
        parentId: null,
        isActive: true,
        sortOrder: parentSort++,
      }
    );
    parentIdByName[parent.name] = doc._id;
    console.log(`✓ Parent: ${parent.name} (${slug})`);
  }

  // 3. Upsert children.
  for (const parent of TREE) {
    let childSort = 0;
    for (const childName of parent.children) {
      const slug = slugify(childName);
      await upsert(
        { slug },
        {
          name: childName,
          slug,
          parentId: parentIdByName[parent.name],
          isActive: true,
          sortOrder: childSort++,
        }
      );
      console.log(`  ↳ ${childName} (${slug})`);
    }
  }

  await mongoose.disconnect();
  console.log("\n✓ Done. Nav should now reflect the defined hierarchy.");
  console.log(
    "  Orphan imported categories remain in the DB but are isActive: false."
  );
})().catch(async (err) => {
  console.error("✗ Failed:", err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
