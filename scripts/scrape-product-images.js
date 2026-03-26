#!/usr/bin/env node

/**
 * Product Image Scraper
 *
 * Searches for real product images from manufacturer/retailer sites,
 * downloads them, uploads to S3, and updates MongoDB.
 *
 * Usage:
 *   node scripts/scrape-product-images.js [--batch-size 10] [--start-page 1] [--dry-run]
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// ── Config ──────────────────────────────────────────────────────────────────

const CONFIG = {
  MONGODB_URI: process.env.MONGODB_URI,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_REGION: process.env.AWS_REGION || 'us-east-1',
  S3_BUCKET: process.env.AWS_S3_BUCKET_NAME || 'multi-electric-supply',
  CLOUDFRONT_DOMAIN: process.env.CLOUDFRONT_DOMAIN || 'd2gzblg3wmeecj.cloudfront.net',

  BATCH_SIZE: 10,       // Products per batch
  DELAY_MS: 2000,       // Delay between searches (be polite)
  MAX_RETRIES: 2,
  PRODUCTS_API: 'https://multielectricsupply.com/api/products',

  // Preferred image sources (in order of priority)
  PREFERRED_DOMAINS: [
    'homedepot.com',
    'lowes.com',
    'amazon.com',
    'enerlites.com',
    'hubbell.com',
    'leviton.com',
    'eaton.com',
    'siemens.com',
    'schneider-electric.com',
    'abb.com',
    'southwire.com',
    'satco.com',
  ],

  LOG_FILE: path.join(__dirname, '..', 'scrape-log.json'),
};

// ── Parse CLI args ──────────────────────────────────────────────────────────

const args = process.argv.slice(2);
let batchSize = CONFIG.BATCH_SIZE;
let startPage = 1;
let dryRun = false;
let maxProducts = Infinity;
let singleProductId = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--batch-size') batchSize = parseInt(args[++i]);
  if (args[i] === '--start-page') startPage = parseInt(args[++i]);
  if (args[i] === '--dry-run') dryRun = true;
  if (args[i] === '--max') maxProducts = parseInt(args[++i]);
  if (args[i] === '--product') singleProductId = args[++i];
}

// ── S3 Client ───────────────────────────────────────────────────────────────

const s3 = new S3Client({
  region: CONFIG.AWS_REGION,
  credentials: {
    accessKeyId: CONFIG.AWS_ACCESS_KEY_ID,
    secretAccessKey: CONFIG.AWS_SECRET_ACCESS_KEY,
  },
});

// ── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === 'https:' ? https : http;

    const req = lib.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': options.accept || 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        ...options.headers,
      },
      timeout: 15000,
    }, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = res.headers.location.startsWith('http')
          ? res.headers.location
          : `${parsed.protocol}//${parsed.host}${res.headers.location}`;
        return fetch(redirectUrl, options).then(resolve).catch(reject);
      }

      if (options.binary) {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolve({
          status: res.statusCode,
          data: Buffer.concat(chunks),
          headers: res.headers,
        }));
      } else {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
      }
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

// ── Build search query from product data ────────────────────────────────────

function buildSearchQuery(product) {
  const parts = [];

  // Extract model number from description or name
  const modelMatch = product.description.match(/(\d{3,}[-A-Z0-9]*)/i)
    || product.name.match(/(\d{3,}[-A-Z0-9]*)/i);

  // Extract brand from description (often first word like "Enerlites", "Satco", etc.)
  const descFirstWord = product.description.split(/\s+/)[0];
  const knownBrands = ['Enerlites', 'Satco', 'Leviton', 'Eaton', 'Hubbell', 'Siemens', 'GE', 'Southwire', 'Schneider'];
  const brandFromDesc = knownBrands.find(b =>
    product.description.toLowerCase().includes(b.toLowerCase())
  );

  // Build query
  if (brandFromDesc) parts.push(brandFromDesc);
  else if (product.brand && product.brand !== 'undefined') parts.push(product.brand);

  // Use product name (cleaned up)
  const cleanName = product.name
    .replace(/-U$/, '')           // Remove -U suffix
    .replace(/\s+/g, ' ')
    .trim();
  parts.push(cleanName);

  if (modelMatch) parts.push(modelMatch[1]);

  // Add "product image" to help search
  parts.push('product');

  return parts.join(' ');
}

// ── Search Bing for product images ──────────────────────────────────────────

async function searchBingImages(query) {
  const encodedQuery = encodeURIComponent(query);
  const url = `https://www.bing.com/images/search?q=${encodedQuery}&form=HDRSC3&first=1`;

  try {
    const res = await fetch(url);
    if (res.status !== 200) return [];

    // Extract murl (media URL) from Bing results
    const imgUrls = [];
    const murlRegex = /murl&quot;:&quot;(https?:\/\/[^&]+?)&quot;/g;
    let m;
    while ((m = murlRegex.exec(res.data)) !== null) {
      const decoded = decodeURIComponent(m[1]);
      if (!decoded.includes('bing.') && !decoded.includes('microsoft.')) {
        imgUrls.push(decoded);
      }
    }

    return [...new Set(imgUrls)];
  } catch (err) {
    console.error(`  Bing search failed for "${query}":`, err.message);
    return [];
  }
}

// ── (Retailer-specific searches removed — Bing covers them) ─────────────────

// ── Rank and select best image ──────────────────────────────────────────────

function rankImageUrl(url) {
  let score = 0;
  const lower = url.toLowerCase();

  // Prefer larger images
  if (lower.includes('1000') || lower.includes('large')) score += 3;
  if (lower.includes('600') || lower.includes('medium')) score += 2;

  // Prefer certain formats
  if (lower.endsWith('.png')) score += 1;
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) score += 1;

  // Prefer product image paths
  if (lower.includes('product')) score += 2;

  // Prefer known retailer CDNs
  if (lower.includes('thdstatic.com')) score += 4;       // Home Depot
  if (lower.includes('media-amazon.com')) score += 3;     // Amazon
  if (lower.includes('lowes.com')) score += 3;

  // Penalize thumbnails
  if (lower.includes('thumb') || lower.includes('_small') || lower.includes('_50')) score -= 5;
  if (lower.includes('icon') || lower.includes('logo')) score -= 5;

  return score;
}

async function findBestImage(product) {
  const query = buildSearchQuery(product);
  console.log(`  Search query: "${query}"`);

  // Search Bing Images
  const allUrls = await searchBingImages(query);

  if (allUrls.length === 0) {
    console.log(`  No images found`);
    return null;
  }

  console.log(`  Found ${allUrls.length} candidate images`);

  // Sort by rank
  const ranked = allUrls
    .map(url => ({ url, score: rankImageUrl(url) }))
    .sort((a, b) => b.score - a.score);

  // Try to download the best ones until one works
  for (const candidate of ranked.slice(0, 5)) {
    try {
      const res = await fetch(candidate.url, { binary: true, accept: 'image/*' });
      if (res.status === 200 && res.data.length > 5000) { // At least 5KB (not a tiny placeholder)
        const contentType = res.headers['content-type'] || '';
        if (contentType.includes('image') || candidate.url.match(/\.(jpg|jpeg|png|webp)$/i)) {
          console.log(`  Selected: ${candidate.url.substring(0, 80)}... (${(res.data.length / 1024).toFixed(0)}KB)`);
          return {
            buffer: res.data,
            contentType: contentType.includes('image') ? contentType : 'image/jpeg',
            sourceUrl: candidate.url,
          };
        }
      }
    } catch (err) {
      // Try next candidate
    }
  }

  console.log(`  All candidates failed to download`);
  return null;
}

// ── Upload to S3 ────────────────────────────────────────────────────────────

async function uploadToS3(productId, imageBuffer, contentType) {
  const ext = contentType.includes('png') ? 'png'
    : contentType.includes('webp') ? 'webp'
    : 'jpg';
  const key = `products/${productId}/${Date.now()}-product.${ext}`;

  await s3.send(new PutObjectCommand({
    Bucket: CONFIG.S3_BUCKET,
    Key: key,
    Body: imageBuffer,
    ContentType: contentType,
  }));

  const url = `https://${CONFIG.CLOUDFRONT_DOMAIN}/${key}`;
  return { key, url };
}

// ── Update MongoDB ──────────────────────────────────────────────────────────

async function updateProductImage(db, productId, imageData) {
  const result = await db.collection('products').updateOne(
    { _id: new mongoose.Types.ObjectId(productId) },
    {
      $set: {
        images: [{
          url: imageData.url,
          key: imageData.key,
          alt: '', // Will be set from product name
          isPrimary: true,
        }],
      },
    }
  );
  return result.modifiedCount > 0;
}

// ── Load/save progress log ──────────────────────────────────────────────────

function loadLog() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG.LOG_FILE, 'utf8'));
  } catch {
    return { processed: {}, stats: { success: 0, failed: 0, skipped: 0 } };
  }
}

function saveLog(log) {
  fs.writeFileSync(CONFIG.LOG_FILE, JSON.stringify(log, null, 2));
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Product Image Scraper ===');
  console.log(`Batch size: ${batchSize}, Start page: ${startPage}, Dry run: ${dryRun}`);
  if (singleProductId) console.log(`Single product: ${singleProductId}`);
  console.log('');

  // Connect to MongoDB
  await mongoose.connect(CONFIG.MONGODB_URI);
  const db = mongoose.connection.db;
  console.log('Connected to MongoDB');

  const log = loadLog();
  let processedCount = 0;

  if (singleProductId) {
    // Process a single product
    const product = await db.collection('products').findOne({
      _id: new mongoose.Types.ObjectId(singleProductId)
    });
    if (!product) {
      console.log('Product not found');
      process.exit(1);
    }

    console.log(`\nProcessing: ${product.name} (${product.sku})`);
    const image = await findBestImage(product);

    if (image && !dryRun) {
      const s3Data = await uploadToS3(product._id.toString(), image.buffer, image.contentType);
      await updateProductImage(db, product._id.toString(), s3Data);
      console.log(`  Uploaded: ${s3Data.url}`);
    }
  } else {
    // Process all products in batches
    let page = startPage;
    let hasMore = true;

    while (hasMore && processedCount < maxProducts) {
      // Fetch products that need images (no images, or broken local paths)
      const products = await db.collection('products')
        .find({
          $or: [
            { images: { $exists: false } },
            { images: { $size: 0 } },
            { "images.url": { $not: /^https:\/\// } }, // broken local paths
          ],
          status: 'active',
        })
        .skip((page - 1) * batchSize)
        .limit(batchSize)
        .toArray();

      if (products.length === 0) {
        hasMore = false;
        break;
      }

      console.log(`\n── Page ${page} (${products.length} products) ──`);

      for (const product of products) {
        const pid = product._id.toString();

        // Skip already processed
        if (log.processed[pid]) {
          console.log(`Skipping ${product.name} (already processed)`);
          log.stats.skipped++;
          continue;
        }

        console.log(`\n[${processedCount + 1}] ${product.name} (${product.sku})`);

        try {
          const image = await findBestImage(product);

          if (image) {
            if (!dryRun) {
              const s3Data = await uploadToS3(pid, image.buffer, image.contentType);
              await updateProductImage(db, pid, { ...s3Data });

              // Update alt text with product name
              await db.collection('products').updateOne(
                { _id: product._id },
                { $set: { 'images.0.alt': product.name } }
              );

              console.log(`  ✓ Uploaded: ${s3Data.url}`);
              log.processed[pid] = { status: 'success', source: image.sourceUrl, timestamp: new Date().toISOString() };
              log.stats.success++;
            } else {
              console.log(`  [DRY RUN] Would upload from: ${image.sourceUrl.substring(0, 80)}`);
              log.processed[pid] = { status: 'dry-run', source: image.sourceUrl };
            }
          } else {
            console.log(`  ✗ No image found`);
            log.processed[pid] = { status: 'no-image', timestamp: new Date().toISOString() };
            log.stats.failed++;
          }
        } catch (err) {
          console.error(`  ✗ Error: ${err.message}`);
          log.processed[pid] = { status: 'error', error: err.message, timestamp: new Date().toISOString() };
          log.stats.failed++;
        }

        processedCount++;
        saveLog(log);

        if (processedCount >= maxProducts) break;

        // Rate limit
        await sleep(CONFIG.DELAY_MS);
      }

      page++;
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Success: ${log.stats.success}`);
  console.log(`Failed:  ${log.stats.failed}`);
  console.log(`Skipped: ${log.stats.skipped}`);
  console.log(`Log saved to: ${CONFIG.LOG_FILE}`);

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
