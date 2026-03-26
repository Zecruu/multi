const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const fetch = require('node-fetch');
const FormData = require('form-data');
const chokidar = require('chokidar');

class SyncEngine {
  constructor({ config, logPath, statePath, onStatus, onSync }) {
    this.config = config;
    this.logPath = logPath;
    this.statePath = statePath;
    this.onStatus = onStatus || (() => {});
    this.onSync = onSync || (() => {});
    this.watcher = null;
    this.scanInterval = null;
    this.processing = false;
    this.state = this._loadState();
    this.stats = {
      status: 'idle',
      lastSync: this.state.lastSync || null,
      totalSynced: this.state.totalSynced || 0,
      totalErrors: this.state.totalErrors || 0,
      filesProcessed: Object.keys(this.state.processedFiles || {}).length,
    };
  }

  // ── State Management ────────────────────────────────────────────────────

  _loadState() {
    try {
      return JSON.parse(fs.readFileSync(this.statePath, 'utf8'));
    } catch {
      return { lastSync: null, processedFiles: {}, totalSynced: 0, totalErrors: 0 };
    }
  }

  _saveState() {
    fs.writeFileSync(this.statePath, JSON.stringify(this.state, null, 2));
  }

  // ── Logging ─────────────────────────────────────────────────────────────

  _log(level, message, data) {
    const timestamp = new Date().toISOString();
    const line = data
      ? `[${timestamp}] [${level.toUpperCase()}] ${message} ${JSON.stringify(data)}`
      : `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    console.log(line);
    try {
      // Rotate if too large
      try {
        const stats = fs.statSync(this.logPath);
        if (stats.size > 10 * 1024 * 1024) {
          const old = this.logPath + '.old';
          if (fs.existsSync(old)) fs.unlinkSync(old);
          fs.renameSync(this.logPath, old);
        }
      } catch {}
      fs.appendFileSync(this.logPath, line + '\n');
    } catch {}
  }

  // ── Start / Stop ────────────────────────────────────────────────────────

  start() {
    const watchFolder = path.resolve(this.config.watch_folder);

    this._log('info', `Sync engine starting...`);
    this._log('info', `Watch folder: ${watchFolder}`);
    this._log('info', `API URL: ${this.config.api.url}`);

    // Ensure watch folder exists
    if (!fs.existsSync(watchFolder)) {
      fs.mkdirSync(watchFolder, { recursive: true });
      this._log('info', `Created watch folder: ${watchFolder}`);
    }

    // File watcher
    this.watcher = chokidar.watch(watchFolder, {
      ignored: /(^|[\/\\])(processed|\.)/,
      persistent: true,
      awaitWriteFinish: { stabilityThreshold: 3000, pollInterval: 500 },
    });

    this.watcher.on('add', (filePath) => {
      if (this._isValidFile(filePath)) {
        this._log('info', `New file detected: ${path.basename(filePath)}`);
        setTimeout(() => this._processFile(filePath), 2000);
      }
    });

    // Periodic scan
    const intervalMs = (this.config.scan_interval || 30) * 1000;
    this.scanInterval = setInterval(() => this.scanNow(), intervalMs);

    // Initial scan
    this.scanNow();

    this.stats.status = 'watching';
    this.onStatus('Watching for files...');
  }

  stop() {
    this._log('info', 'Sync engine stopping...');
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    this._saveState();
    this.stats.status = 'stopped';
    this.onStatus('Stopped');
  }

  getStats() {
    return { ...this.stats };
  }

  // ── File Handling ───────────────────────────────────────────────────────

  _isValidFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return ['.xls', '.xlsx'].includes(ext);
  }

  _getFileHash(filePath) {
    const stats = fs.statSync(filePath);
    return `${path.basename(filePath)}-${stats.size}-${stats.mtimeMs}`;
  }

  async scanNow() {
    if (this.processing) return;

    const watchFolder = path.resolve(this.config.watch_folder);
    if (!fs.existsSync(watchFolder)) return;

    const files = fs.readdirSync(watchFolder)
      .filter(f => this._isValidFile(f))
      .map(f => path.join(watchFolder, f))
      .sort((a, b) => fs.statSync(a).mtimeMs - fs.statSync(b).mtimeMs);

    if (files.length === 0) return;

    this._log('info', `Found ${files.length} file(s) to process`);

    for (const filePath of files) {
      await this._processFile(filePath);
    }
  }

  // ── Parse Export File ───────────────────────────────────────────────────

  _parseFile(filePath) {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames.includes('Sheet1')
      ? 'Sheet1' : workbook.SheetNames[0];
    if (!sheetName) throw new Error('No sheets found');

    const sheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(sheet, { defval: '' });
  }

  _getField(row, ...names) {
    for (const name of names) {
      if (row[name] !== undefined && row[name] !== '') return row[name];
    }
    return '';
  }

  _parseNumber(value) {
    if (value === null || value === undefined || value === '' || value === 'No') return null;
    const num = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : Number(value);
    return isNaN(num) ? null : num;
  }

  _cleanSku(code) {
    let sku = String(code).trim().replace(/^\+\s*/, '');
    sku = sku.replace(/\s+/g, '-').toUpperCase();
    sku = sku.replace(/[^A-Z0-9\-\/]/g, '');
    return sku || `SKU-${Date.now()}`;
  }

  // ── Extract products from file ──────────────────────────────────────────

  _extractProducts(rows) {
    const products = [];

    for (const row of rows) {
      const lookupCode = String(this._getField(row, 'Item Lookup Code', 'ItemLookupCode', 'SKU', 'Code')).trim();
      const description = String(this._getField(row, 'Description', 'Name', 'Product Name')).trim();

      if (!lookupCode || !description) continue;

      const sku = this._cleanSku(lookupCode);
      const price = this._parseNumber(this._getField(row, 'Price', 'SalePrice', 'Retail'));

      if (price === null || price <= 0) continue;

      const cost = this._parseNumber(this._getField(row, 'Cost', 'CostPrice'));
      const qtyOnHand = this._parseNumber(this._getField(row, 'Qty On Hand', 'QtyOnHand', 'Stock'));
      const availQty = this._parseNumber(this._getField(row, 'Available Quantity', 'AvailableQuantity', 'Available'));
      const quantity = Math.max(availQty || 0, qtyOnHand || 0, 0);

      products.push({
        sku,
        name: description.substring(0, 200),
        price,
        costPrice: cost,
        quantity,
      });
    }

    return products;
  }

  // ── Fetch live data from website and compare ────────────────────────────

  async _fetchLiveProducts() {
    const apiUrl = this.config.api.url.replace(/\/$/, '');
    const allProducts = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        const res = await fetch(`${apiUrl}/api/products?limit=100&page=${page}`, {
          timeout: 30000,
        });

        if (!res.ok) break;

        const data = await res.json();
        if (data.products && data.products.length > 0) {
          allProducts.push(...data.products);
          hasMore = page < (data.pagination?.pages || 1);
          page++;
        } else {
          hasMore = false;
        }
      } catch (err) {
        this._log('warn', `Failed to fetch page ${page}: ${err.message}`);
        break;
      }
    }

    // Index by SKU for fast lookup
    const skuMap = {};
    for (const p of allProducts) {
      skuMap[p.sku] = {
        price: p.price,
        costPrice: p.costPrice,
        quantity: p.quantity,
        name: p.name,
      };
    }

    return skuMap;
  }

  _compareProducts(importedProducts, liveProducts) {
    const changes = {
      new: [],
      priceChanged: [],
      stockChanged: [],
      costChanged: [],
      unchanged: [],
    };

    for (const product of importedProducts) {
      const live = liveProducts[product.sku];

      if (!live) {
        changes.new.push(product);
        continue;
      }

      const priceChanged = Math.abs(live.price - product.price) > 0.01;
      const stockChanged = live.quantity !== product.quantity;
      const costChanged = product.costPrice !== null &&
        live.costPrice !== undefined &&
        Math.abs((live.costPrice || 0) - product.costPrice) > 0.01;

      if (priceChanged || stockChanged || costChanged) {
        const change = { ...product, changes: [] };
        if (priceChanged) change.changes.push(`price: $${live.price} -> $${product.price}`);
        if (stockChanged) change.changes.push(`stock: ${live.quantity} -> ${product.quantity}`);
        if (costChanged) change.changes.push(`cost: $${live.costPrice || 0} -> $${product.costPrice}`);

        if (priceChanged) changes.priceChanged.push(change);
        else if (stockChanged) changes.stockChanged.push(change);
        else if (costChanged) changes.costChanged.push(change);
      } else {
        changes.unchanged.push(product);
      }
    }

    return changes;
  }

  // ── Process a single file ─────────────────────────────────────────────

  async _processFile(filePath) {
    if (this.processing) return;
    this.processing = true;

    const fileName = path.basename(filePath);
    const fileHash = this._getFileHash(filePath);

    // Skip already processed
    if (this.state.processedFiles[fileHash]) {
      this._log('debug', `Already processed: ${fileName}`);
      this.processing = false;
      return;
    }

    // Skip old files
    if (this.config.processing?.skip_older_than_days) {
      const stats = fs.statSync(filePath);
      const ageDays = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24);
      if (ageDays > this.config.processing.skip_older_than_days) {
        this._log('info', `Skipping old file (${ageDays.toFixed(1)} days): ${fileName}`);
        this.processing = false;
        return;
      }
    }

    this.stats.status = 'syncing';
    this.onStatus(`Syncing: ${fileName}`);
    this._log('info', `\n${'='.repeat(50)}`);
    this._log('info', `Processing: ${fileName}`);

    try {
      // 1. Parse the export file
      const rows = this._parseFile(filePath);
      this._log('info', `Parsed ${rows.length} rows`);

      const importedProducts = this._extractProducts(rows);
      this._log('info', `Extracted ${importedProducts.length} valid products`);

      // 2. Fetch live data from website
      this._log('info', 'Fetching live product data from website...');
      const liveProducts = await this._fetchLiveProducts();
      this._log('info', `Fetched ${Object.keys(liveProducts).length} products from website`);

      // 3. Compare and find changes
      const changes = this._compareProducts(importedProducts, liveProducts);

      const totalChanges = changes.new.length + changes.priceChanged.length +
        changes.stockChanged.length + changes.costChanged.length;

      this._log('info', `Comparison results:`);
      this._log('info', `  New products: ${changes.new.length}`);
      this._log('info', `  Price changes: ${changes.priceChanged.length}`);
      this._log('info', `  Stock changes: ${changes.stockChanged.length}`);
      this._log('info', `  Cost changes: ${changes.costChanged.length}`);
      this._log('info', `  Unchanged: ${changes.unchanged.length}`);

      if (totalChanges === 0) {
        this._log('info', 'No changes detected. Skipping upload.');
        this.state.processedFiles[fileHash] = {
          timestamp: new Date().toISOString(),
          status: 'no-changes',
          totalRows: rows.length,
        };
        this._saveState();
        this._moveProcessedFile(filePath);
        this.processing = false;
        this.stats.status = 'watching';
        this.onStatus('Watching for files...');

        this.onSync({
          success: true,
          file: fileName,
          message: 'No changes detected',
          changes,
        });
        return;
      }

      // 4. Upload the file (let the server handle the actual DB updates)
      this._log('info', `${totalChanges} changes found. Uploading...`);
      const result = await this._upload(filePath);

      if (result.success) {
        this._log('info', `Sync successful!`);
        this._log('info', `  Created: ${result.created}`);
        this._log('info', `  Updated: ${result.updated}`);
        this._log('info', `  Skipped: ${result.skipped}`);

        this.state.lastSync = new Date().toISOString();
        this.state.totalSynced = (this.state.totalSynced || 0) + result.created + result.updated;
        this.state.processedFiles[fileHash] = {
          timestamp: new Date().toISOString(),
          status: 'success',
          created: result.created,
          updated: result.updated,
          totalRows: rows.length,
          changes: totalChanges,
        };
        this._saveState();

        this.stats.lastSync = this.state.lastSync;
        this.stats.totalSynced = this.state.totalSynced;
        this.stats.filesProcessed++;

        // Send email notification
        await this._notify(
          `Sync Complete - ${fileName}`,
          `Product sync completed successfully.\n\n` +
          `File: ${fileName}\n` +
          `Total Rows: ${rows.length}\n` +
          `New Products: ${changes.new.length}\n` +
          `Price Changes: ${changes.priceChanged.length}\n` +
          `Stock Changes: ${changes.stockChanged.length}\n` +
          `Cost Changes: ${changes.costChanged.length}\n` +
          `Unchanged: ${changes.unchanged.length}\n` +
          `\nServer Response:\n` +
          `Created: ${result.created}\n` +
          `Updated: ${result.updated}\n` +
          `Skipped: ${result.skipped}\n` +
          `Time: ${new Date().toLocaleString()}`
        );

        this._moveProcessedFile(filePath);

        this.onSync({
          success: true,
          file: fileName,
          ...result,
          changes,
        });
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (err) {
      this._log('error', `Failed to process ${fileName}: ${err.message}`);
      this.state.totalErrors = (this.state.totalErrors || 0) + 1;
      this.stats.totalErrors = this.state.totalErrors;
      this._saveState();

      await this._notify(
        `Sync Error - ${fileName}`,
        `An error occurred during sync.\n\nFile: ${fileName}\nError: ${err.message}\nTime: ${new Date().toLocaleString()}`
      );

      this.onSync({
        success: false,
        file: fileName,
        error: err.message,
      });
    }

    this.processing = false;
    this.stats.status = 'watching';
    this.onStatus('Watching for files...');
  }

  // ── Upload to server ──────────────────────────────────────────────────

  async _upload(filePath) {
    const apiUrl = this.config.api.url.replace(/\/$/, '');
    const endpoint = `${apiUrl}/api/admin/sync-agent/import`;

    const form = new FormData();
    form.append('file', fs.createReadStream(filePath), {
      filename: path.basename(filePath),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        ...form.getHeaders(),
        'x-sync-key': this.config.api.sync_key,
        'x-agent-version': '1.0.0',
      },
      body: form,
      timeout: 120000,
    });

    const data = await res.json();

    if (res.status === 401) {
      throw new Error('Authentication failed. Check your sync key.');
    }

    if (!res.ok) {
      throw new Error(data.error || data.message || `HTTP ${res.status}`);
    }

    return data;
  }

  // ── Notification ──────────────────────────────────────────────────────

  async _notify(subject, body) {
    if (!this.config.notifications?.enabled) return;

    const apiUrl = this.config.api.url.replace(/\/$/, '');

    try {
      await fetch(`${apiUrl}/api/admin/sync-agent/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sync-key': this.config.api.sync_key,
        },
        body: JSON.stringify({
          subject,
          body,
          recipients: this.config.notifications.recipients || [],
        }),
        timeout: 15000,
      });
    } catch (err) {
      this._log('warn', `Notification failed: ${err.message}`);
    }
  }

  // ── Move/delete processed file ────────────────────────────────────────

  _moveProcessedFile(filePath) {
    try {
      if (this.config.processing?.delete_after_sync) {
        fs.unlinkSync(filePath);
        this._log('info', `Deleted: ${path.basename(filePath)}`);
      } else if (this.config.processing?.move_after_sync !== false) {
        const processedDir = path.join(path.dirname(filePath), 'processed');
        if (!fs.existsSync(processedDir)) fs.mkdirSync(processedDir, { recursive: true });
        const dest = path.join(processedDir, `${Date.now()}-${path.basename(filePath)}`);
        fs.renameSync(filePath, dest);
        this._log('info', `Moved to: ${dest}`);
      }
    } catch (err) {
      this._log('warn', `Failed to move/delete file: ${err.message}`);
    }
  }
}

module.exports = SyncEngine;
