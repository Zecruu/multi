#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

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

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const Product = db.collection("products");

  const total = await Product.countDocuments({});
  const active = await Product.countDocuments({ status: "active" });
  console.log(`Total products: ${total}  Active: ${active}`);

  const catAgg = await Product.aggregate([
    { $group: { _id: "$category", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]).toArray();
  console.log(`\nDistinct categories: ${catAgg.length}`);
  for (const r of catAgg) console.log(`  ${r.count.toString().padStart(5)}  ${r._id}`);

  const brandAgg = await Product.aggregate([
    { $group: { _id: "$brand", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]).toArray();
  console.log(`\nDistinct brands: ${brandAgg.length}`);
  for (const r of brandAgg) console.log(`  ${r.count.toString().padStart(5)}  ${r._id ?? "(none)"}`);

  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
