#!/usr/bin/env node

/**
 * Multi Electric Supply - Sync Agent
 *
 * Watches a folder for .xls/.xlsx export files from the inventory system,
 * parses them, and uploads product data to the ecommerce platform.
 *
 * Features:
 * - Folder watching with configurable scan interval
 * - Smart diff detection (only syncs changes)
 * - Email notifications via Resend
 * - Detailed logging with rotation
 * - Auto-update from GitHub releases
 * - YAML configuration
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const yaml = require('js-yaml');
const XLSX = require('xlsx');
const FormData = require('form-data');
const chokidar = require('chokidar');

// ── Paths ───────────────────────────────────────────────────────────────────

const AGENT_DIR = path.dirname(process.execPath.includes('node') ? __filename : process.execPath);
const CONFIG_PATH = path.join(AGENT_DIR, 'config.yaml');
const DEFAULT_CONFIG_PATH = path.join(AGENT_DIR, 'config.default.yaml');
const STATE_PATH = path.join(AGENT_DIR, '.sync-state.json');
const VERSION = '1.1.1';

// ── Logger ──────────────────────────────────────────────────────────────────

class Logger {
  constructor(config) {
    this.logFile = path.resolve(AGENT_DIR, config.file || 'sync.log');
    this.level = config.level || 'info';
    this.maxSizeMb = config.max_size_mb || 10;
    this.levels = { debug: 0, info: 1, warn: 2, error: 3 };
  }

  _shouldLog(level) {
    return (this.levels[level] || 0) >= (this.levels[this.level] || 0);
  }

  _rotate() {
    try {
      const stats = fs.statSync(this.logFile);
      if (stats.size > this.maxSizeMb * 1024 * 1024) {
        const rotated = this.logFile + '.old';
        if (fs.existsSync(rotated)) fs.unlinkSync(rotated);
        fs.renameSync(this.logFile, rotated);
      }
    } catch {
      // File doesn't exist yet, that's fine
    }
  }

  _write(level, message, data) {
    if (!this._shouldLog(level)) return;

    this._rotate();

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    const line = data
      ? `${prefix} ${message} ${JSON.stringify(data)}`
      : `${prefix} ${message}`;

    console.log(line);

    try {
      fs.appendFileSync(this.logFile, line + '\n');
    } catch (err) {
      console.error('Failed to write log:', err.message);
    }
  }

  debug(msg, data) { this._write('debug', msg, data); }
  info(msg, data) { this._write('info', msg, data); }
  warn(msg, data) { this._write('warn', msg, data); }
  error(msg, data) { this._write('error', msg, data); }
}

// ── Config ──────────────────────────────────────────────────────────────────

function loadConfig() {
  let configPath = CONFIG_PATH;

  if (!fs.existsSync(configPath)) {
    if (fs.existsSync(DEFAULT_CONFIG_PATH)) {
      console.log('No config.yaml found. Copying default config...');
      fs.copyFileSync(DEFAULT_CONFIG_PATH, configPath);
      console.log(`Created config.yaml at: ${configPath}`);
      console.log('Please edit config.yaml with your settings and restart the agent.');
      process.exit(0);
    } else {
      console.error('No config.yaml or config.default.yaml found!');
      process.exit(1);
    }
  }

  const raw = fs.readFileSync(configPath, 'utf8');
  const config = yaml.load(raw);

  // Validate required fields
  if (!config.watch_folder) throw new Error('config: watch_folder is required');
  if (!config.api?.url) throw new Error('config: api.url is required');
  if (!config.api?.sync_key || config.api.sync_key === 'YOUR_SYNC_KEY_HERE') {
    throw new Error('config: api.sync_key must be set. Get it from Admin > Sync Agent');
  }

  return config;
}

// ── State (tracks last sync per file hash) ──────────────────────────────────

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
  } catch {
    return { lastSync: null, processedFiles: {}, lastHash: null };
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

// ── HTTP helpers ────────────────────────────────────────────────────────────

function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === 'https:' ? https : http;

    const reqOptions = {
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: options.timeout || 60000,
    };

    const req = lib.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data), headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });

    if (options.body) {
      if (options.body instanceof FormData) {
        options.body.pipe(req);
      } else {
        req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
        req.end();
      }
    } else {
      req.end();
    }
  });
}

// ── File processing ─────────────────────────────────────────────────────────

function getFileHash(filePath) {
  const stats = fs.statSync(filePath);
  return `${path.basename(filePath)}-${stats.size}-${stats.mtimeMs}`;
}

function isValidExportFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ['.xls', '.xlsx'].includes(ext);
}

function parseExportFile(filePath, logger) {
  logger.info(`Parsing file: ${path.basename(filePath)}`);

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames.includes('Sheet1')
    ? 'Sheet1'
    : workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error('No sheets found in workbook');
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  logger.info(`Found ${rows.length} rows in sheet "${sheetName}"`);

  if (rows.length === 0) {
    throw new Error('No data rows found in file');
  }

  // Log detected columns
  const columns = Object.keys(rows[0]);
  logger.debug('Detected columns:', columns);

  return { rows, columns, sheetName };
}

function computeDataHash(rows) {
  // Simple hash based on SKU + price + quantity for change detection
  const summary = rows.map(r => {
    const sku = r['Item Lookup Code'] || r['ItemLookupCode'] || r['SKU'] || r['Code'] || '';
    const price = r['Price'] || r['SalePrice'] || r['Retail'] || '';
    const qty = r['Qty On Hand'] || r['QtyOnHand'] || r['Stock'] || '';
    return `${sku}:${price}:${qty}`;
  }).join('|');

  // Simple hash
  let hash = 0;
  for (let i = 0; i < summary.length; i++) {
    const char = summary.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

// ── Upload to ecommerce ─────────────────────────────────────────────────────

async function uploadToEcommerce(filePath, config, logger) {
  const apiUrl = config.api.url.replace(/\/$/, '');
  const endpoint = `${apiUrl}/api/admin/sync-agent/import`;

  logger.info(`Uploading to: ${endpoint}`);

  // Buffer the file so redirects (apex → www) don't break the upload —
  // form-data built from a stream can't be replayed after a 301.
  const fileBuffer = fs.readFileSync(filePath);

  const form = new FormData();
  form.append('file', fileBuffer, {
    filename: path.basename(filePath),
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const headers = {
    ...form.getHeaders(),
    'content-length': form.getLengthSync(),
    'x-sync-key': config.api.sync_key,
    'x-agent-version': VERSION,
  };

  const response = await httpRequest(endpoint, {
    method: 'POST',
    headers,
    body: form,
    timeout: 120000, // 2 minutes for large files
  });

  return response;
}

// ── Email notification ──────────────────────────────────────────────────────

async function sendNotification(config, logger, subject, body) {
  if (!config.notifications?.enabled) return;

  const apiUrl = config.api.url.replace(/\/$/, '');
  const endpoint = `${apiUrl}/api/admin/sync-agent/notify`;

  try {
    await httpRequest(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sync-key': config.api.sync_key,
      },
      body: JSON.stringify({
        subject,
        body,
        recipients: config.notifications.recipients || [],
      }),
    });
    logger.info('Notification sent');
  } catch (err) {
    logger.warn(`Failed to send notification: ${err.message}`);
  }
}

// ── Auto-update ─────────────────────────────────────────────────────────────

async function checkForUpdates(config, logger) {
  if (!config.auto_update?.enabled) return null;

  const repo = config.auto_update.repo || 'Zecruu/multi-electric-sync';
  const url = `https://api.github.com/repos/${repo}/releases/latest`;

  try {
    const response = await httpRequest(url, {
      headers: { 'User-Agent': 'MultiElectricSyncAgent/' + VERSION },
      timeout: 10000,
    });

    if (response.status !== 200) {
      logger.debug('No releases found or rate limited');
      return null;
    }

    const release = response.data;
    const latestVersion = release.tag_name.replace(/^v/, '');

    if (latestVersion !== VERSION) {
      logger.info(`Update available: v${VERSION} -> v${latestVersion}`);

      // Find the Windows exe asset
      const asset = release.assets?.find(a =>
        a.name.toLowerCase().includes('.exe') ||
        a.name.toLowerCase().includes('win')
      );

      if (asset) {
        return {
          version: latestVersion,
          downloadUrl: asset.browser_download_url,
          releaseNotes: release.body,
          fileName: asset.name,
        };
      }
    }

    logger.debug(`Already on latest version: v${VERSION}`);
    return null;
  } catch (err) {
    logger.warn(`Update check failed: ${err.message}`);
    return null;
  }
}

async function downloadUpdate(update, logger) {
  logger.info(`Downloading update v${update.version}...`);

  const updateDir = path.join(AGENT_DIR, '.update');
  if (!fs.existsSync(updateDir)) fs.mkdirSync(updateDir);

  const updatePath = path.join(updateDir, update.fileName);

  return new Promise((resolve, reject) => {
    const download = (url) => {
      https.get(url, {
        headers: { 'User-Agent': 'MultiElectricSyncAgent/' + VERSION },
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return download(res.headers.location);
        }

        const file = fs.createWriteStream(updatePath);
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          logger.info(`Update downloaded to: ${updatePath}`);
          logger.info('Please restart the agent to apply the update.');
          resolve(updatePath);
        });
      }).on('error', reject);
    };

    download(update.downloadUrl);
  });
}

// ── File processing after sync ──────────────────────────────────────────────

function handleProcessedFile(filePath, config, logger) {
  if (config.processing?.delete_after_sync) {
    fs.unlinkSync(filePath);
    logger.info(`Deleted: ${path.basename(filePath)}`);
  } else if (config.processing?.move_after_sync !== false) {
    const processedDir = path.join(path.dirname(filePath), 'processed');
    if (!fs.existsSync(processedDir)) fs.mkdirSync(processedDir, { recursive: true });

    const dest = path.join(processedDir, `${Date.now()}-${path.basename(filePath)}`);
    fs.renameSync(filePath, dest);
    logger.info(`Moved to: ${dest}`);
  }
}

// ── Process a single file ───────────────────────────────────────────────────

async function processFile(filePath, config, logger, state) {
  const fileName = path.basename(filePath);

  // Check if file is old
  if (config.processing?.skip_older_than_days) {
    const stats = fs.statSync(filePath);
    const ageDays = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24);
    if (ageDays > config.processing.skip_older_than_days) {
      logger.info(`Skipping old file (${ageDays.toFixed(1)} days): ${fileName}`);
      return;
    }
  }

  // Check if already processed (same file hash)
  const fileHash = getFileHash(filePath);
  if (state.processedFiles[fileHash]) {
    logger.debug(`Already processed: ${fileName}`);
    return;
  }

  logger.info(`\n${'='.repeat(50)}`);
  logger.info(`Processing: ${fileName}`);
  logger.info(`${'='.repeat(50)}`);

  try {
    // Parse the file
    const { rows, columns } = parseExportFile(filePath, logger);

    // Check if data has actually changed
    const dataHash = computeDataHash(rows);
    if (dataHash === state.lastHash) {
      logger.info('No data changes detected since last sync. Skipping.');
      state.processedFiles[fileHash] = { timestamp: new Date().toISOString(), status: 'skipped-no-changes' };
      saveState(state);
      handleProcessedFile(filePath, config, logger);
      return;
    }

    // Upload to ecommerce
    const result = await uploadToEcommerce(filePath, config, logger);

    if (result.status === 200 || result.status === 201) {
      const data = result.data;
      logger.info(`Sync successful!`);
      logger.info(`  Created: ${data.created || 0}`);
      logger.info(`  Updated: ${data.updated || 0}`);
      logger.info(`  Skipped: ${data.skipped || 0}`);
      logger.info(`  Errors: ${data.totalErrors || 0}`);

      // Update state
      state.lastSync = new Date().toISOString();
      state.lastHash = dataHash;
      state.processedFiles[fileHash] = {
        timestamp: new Date().toISOString(),
        status: 'success',
        created: data.created,
        updated: data.updated,
        rows: rows.length,
      };
      saveState(state);

      // Send success notification
      await sendNotification(config, logger,
        `Sync Complete - ${fileName}`,
        `Product sync completed successfully.\n\n` +
        `File: ${fileName}\n` +
        `Total Rows: ${rows.length}\n` +
        `Created: ${data.created || 0}\n` +
        `Updated: ${data.updated || 0}\n` +
        `Skipped: ${data.skipped || 0}\n` +
        `Errors: ${data.totalErrors || 0}\n` +
        `Time: ${new Date().toLocaleString()}`
      );

      // Move/delete processed file
      handleProcessedFile(filePath, config, logger);

    } else if (result.status === 401) {
      logger.error('Authentication failed. Check your sync_key in config.yaml');
      await sendNotification(config, logger,
        'Sync Failed - Authentication Error',
        `The sync agent could not authenticate with the server.\nPlease check your sync_key in config.yaml.`
      );
    } else {
      const errMsg = result.data?.error || result.data?.message || `HTTP ${result.status}`;
      logger.error(`Upload failed: ${errMsg}`);
      await sendNotification(config, logger,
        `Sync Failed - ${fileName}`,
        `Product sync failed.\n\nFile: ${fileName}\nError: ${errMsg}\nTime: ${new Date().toLocaleString()}`
      );
    }
  } catch (err) {
    logger.error(`Failed to process ${fileName}: ${err.message}`);
    await sendNotification(config, logger,
      `Sync Error - ${fileName}`,
      `An error occurred during sync.\n\nFile: ${fileName}\nError: ${err.message}\nTime: ${new Date().toLocaleString()}`
    );
  }
}

// ── Scan folder for new files ───────────────────────────────────────────────

async function scanFolder(watchFolder, config, logger, state) {
  if (!fs.existsSync(watchFolder)) {
    logger.warn(`Watch folder does not exist: ${watchFolder}`);
    return;
  }

  const files = fs.readdirSync(watchFolder)
    .filter(f => isValidExportFile(f))
    .map(f => path.join(watchFolder, f))
    .sort((a, b) => fs.statSync(a).mtimeMs - fs.statSync(b).mtimeMs);

  if (files.length === 0) {
    logger.debug('No export files found');
    return;
  }

  logger.info(`Found ${files.length} export file(s)`);

  for (const filePath of files) {
    await processFile(filePath, config, logger, state);
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║   Multi Electric Supply - Sync Agent     ║
  ║   Version ${VERSION}                          ║
  ╚══════════════════════════════════════════╝
  `);

  // Load config
  let config;
  try {
    config = loadConfig();
  } catch (err) {
    console.error(`Configuration error: ${err.message}`);
    console.error(`Edit config.yaml at: ${CONFIG_PATH}`);
    process.exit(1);
  }

  const logger = new Logger(config.logging || {});
  const state = loadState();

  logger.info(`Agent v${VERSION} starting...`);
  logger.info(`Watch folder: ${config.watch_folder}`);
  logger.info(`API URL: ${config.api.url}`);
  logger.info(`Scan interval: ${config.scan_interval || 30}s`);

  // Ensure watch folder exists
  const watchFolder = path.resolve(config.watch_folder);
  if (!fs.existsSync(watchFolder)) {
    logger.info(`Creating watch folder: ${watchFolder}`);
    fs.mkdirSync(watchFolder, { recursive: true });
  }

  // Initial scan
  logger.info('Running initial scan...');
  await scanFolder(watchFolder, config, logger, state);

  // Set up file watcher for real-time detection
  const watcher = chokidar.watch(watchFolder, {
    ignored: /(^|[\/\\])(processed|\.)/,
    persistent: true,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 500,
    },
  });

  watcher.on('add', async (filePath) => {
    if (!isValidExportFile(filePath)) return;
    logger.info(`New file detected: ${path.basename(filePath)}`);
    // Small delay to ensure file is fully written
    setTimeout(async () => {
      await processFile(filePath, config, logger, state);
    }, 1000);
  });

  logger.info('Watching for new files...');

  // Periodic scan as backup
  const scanIntervalMs = (config.scan_interval || 30) * 1000;
  setInterval(async () => {
    logger.debug('Periodic scan...');
    await scanFolder(watchFolder, config, logger, state);
  }, scanIntervalMs);

  // Auto-update check
  if (config.auto_update?.enabled) {
    const updateIntervalMs = (config.auto_update.check_interval_hours || 6) * 60 * 60 * 1000;

    const doUpdateCheck = async () => {
      const update = await checkForUpdates(config, logger);
      if (update) {
        await sendNotification(config, logger,
          `Sync Agent Update Available: v${update.version}`,
          `A new version of the sync agent is available.\n\n` +
          `Current: v${VERSION}\n` +
          `Latest: v${update.version}\n\n` +
          `Release Notes:\n${update.releaseNotes || 'N/A'}\n\n` +
          `The update will be downloaded automatically.`
        );
        await downloadUpdate(update, logger);
      }
    };

    // Check on startup (after 30 seconds)
    setTimeout(doUpdateCheck, 30000);
    // Then periodically
    setInterval(doUpdateCheck, updateIntervalMs);
  }

  // Graceful shutdown
  const shutdown = () => {
    logger.info('Shutting down...');
    watcher.close();
    saveState(state);
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Keep process alive
  logger.info('Agent is running. Press Ctrl+C to stop.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
