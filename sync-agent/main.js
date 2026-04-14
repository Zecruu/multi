const { app, BrowserWindow, Tray, Menu, ipcMain, dialog, nativeImage } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const SyncEngine = require('./sync-engine');

// ── Paths ───────────────────────────────────────────────────────────────────

const USER_DATA = app.getPath('userData');
const CONFIG_PATH = path.join(USER_DATA, 'config.yaml');
const LOGS_DIR = path.join(USER_DATA, 'logs');
const LOG_PATH = path.join(LOGS_DIR, 'sync.log');
const STATE_PATH = path.join(USER_DATA, '.sync-state.json');

// Ensure logs dir exists; on each app-start, archive the previous log.
function ensureLogsDir() {
  if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });

  // One-time migration: move old flat sync.log into the folder.
  const legacy = path.join(USER_DATA, 'sync.log');
  if (fs.existsSync(legacy) && !fs.existsSync(LOG_PATH)) {
    try { fs.renameSync(legacy, LOG_PATH); } catch {}
  }

  // If there's an existing log from a prior run, rotate it.
  if (fs.existsSync(LOG_PATH)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const archived = path.join(LOGS_DIR, `sync-${stamp}.log`);
    try { fs.renameSync(LOG_PATH, archived); } catch {}
    // Keep only the 10 most recent archives.
    try {
      const files = fs.readdirSync(LOGS_DIR)
        .filter((f) => /^sync-.*\.log$/.test(f))
        .map((f) => ({ f, t: fs.statSync(path.join(LOGS_DIR, f)).mtimeMs }))
        .sort((a, b) => b.t - a.t);
      for (const old of files.slice(10)) {
        try { fs.unlinkSync(path.join(LOGS_DIR, old.f)); } catch {}
      }
    } catch {}
  }
}
ensureLogsDir();

let mainWindow = null;
let tray = null;
let syncEngine = null;
let isQuitting = false;
let updateState = { status: 'idle', version: null, error: null };

function sendUpdateState() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-state', updateState);
  }
}

// ── Config ──────────────────────────────────────────────────────────────────

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) return null;
  try {
    return yaml.load(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_PATH, yaml.dump(config, { lineWidth: -1 }));
}

function isConfigured() {
  const config = loadConfig();
  return config && config.watch_folder && config.api?.sync_key && config.api?.url;
}

// ── Window ──────────────────────────────────────────────────────────────────

function createWindow() {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
    return;
  }

  const configured = isConfigured();

  mainWindow = new BrowserWindow({
    width: configured ? 500 : 600,
    height: configured ? 600 : 700,
    resizable: false,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    autoHideMenuBar: true,
    title: 'MultiElectric Sync Agent',
  });

  if (configured) {
    mainWindow.loadFile('ui/dashboard.html');
  } else {
    mainWindow.loadFile('ui/setup.html');
  }

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ── System Tray ─────────────────────────────────────────────────────────────

function createTray() {
  // Create a simple tray icon (green circle = running)
  const iconPath = path.join(__dirname, 'icon.png');
  let trayIcon;
  if (fs.existsSync(iconPath)) {
    trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  } else {
    // Fallback: create a simple colored icon
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Dashboard',
      click: () => createWindow(),
    },
    {
      label: 'Sync Now',
      click: () => {
        if (syncEngine) syncEngine.scanNow();
      },
    },
    { type: 'separator' },
    {
      label: 'View Log',
      click: () => {
        const { shell } = require('electron');
        shell.openPath(LOG_PATH);
      },
    },
    {
      label: 'Open Log Folder',
      click: () => {
        const { shell } = require('electron');
        shell.openPath(LOGS_DIR);
      },
    },
    {
      label: 'Open Config',
      click: () => {
        const { shell } = require('electron');
        shell.openPath(CONFIG_PATH);
      },
    },
    { type: 'separator' },
    {
      label: 'Check for Updates',
      click: () => autoUpdater.checkForUpdatesAndNotify(),
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip('MultiElectric Sync Agent');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => createWindow());
}

// ── IPC Handlers (UI <-> Main Process) ──────────────────────────────────────

function setupIPC() {
  // Setup wizard: pick folder
  ipcMain.handle('pick-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Watch Folder',
    });
    return result.canceled ? null : result.filePaths[0];
  });

  // Setup wizard: save config
  ipcMain.handle('save-config', async (event, config) => {
    saveConfig(config);
    return true;
  });

  // Setup wizard: test connection
  ipcMain.handle('test-connection', async (event, apiUrl, syncKey) => {
    try {
      const fetch = require('node-fetch');
      const res = await fetch(`${apiUrl}/api/admin/sync-agent`, {
        headers: { 'x-sync-key': syncKey },
        timeout: 10000,
      });
      return { success: res.ok, status: res.status };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Get config
  ipcMain.handle('get-config', () => loadConfig());

  // Get state/stats
  ipcMain.handle('get-stats', () => {
    if (!syncEngine) return null;
    return syncEngine.getStats();
  });

  // Get log
  ipcMain.handle('get-log', () => {
    try {
      const log = fs.readFileSync(LOG_PATH, 'utf8');
      // Return last 100 lines
      return log.split('\n').slice(-100).join('\n');
    } catch {
      return 'No log entries yet.';
    }
  });

  // Manual sync trigger
  ipcMain.handle('sync-now', async () => {
    if (syncEngine) {
      await syncEngine.scanNow();
      return true;
    }
    return false;
  });

  // Finish setup and start engine
  ipcMain.handle('finish-setup', async () => {
    startSyncEngine();
    if (mainWindow) {
      mainWindow.setSize(500, 600);
      mainWindow.loadFile('ui/dashboard.html');
    }
    return true;
  });

  // Get paths
  ipcMain.handle('get-paths', () => ({
    config: CONFIG_PATH,
    log: LOG_PATH,
    logsDir: LOGS_DIR,
    state: STATE_PATH,
    userData: USER_DATA,
  }));

  // Open log folder
  ipcMain.handle('open-logs-folder', () => {
    const { shell } = require('electron');
    return shell.openPath(LOGS_DIR);
  });

  // Version info
  ipcMain.handle('get-version', () => ({
    version: app.getVersion(),
    electron: process.versions.electron,
    node: process.versions.node,
  }));

  // Update state snapshot (for UI initial render)
  ipcMain.handle('get-update-state', () => updateState);

  // Manual update check
  ipcMain.handle('check-for-updates', async () => {
    updateState = { status: 'checking', version: null, error: null };
    sendUpdateState();
    try {
      const result = await autoUpdater.checkForUpdates();
      // If nothing newer, checkForUpdates resolves with updateInfo == current version
      if (!result || !result.updateInfo || result.updateInfo.version === app.getVersion()) {
        updateState = { status: 'up-to-date', version: app.getVersion(), error: null };
        sendUpdateState();
      }
      return updateState;
    } catch (err) {
      updateState = { status: 'error', version: null, error: err.message };
      sendUpdateState();
      return updateState;
    }
  });

  // Install downloaded update immediately
  ipcMain.handle('install-update', () => {
    if (updateState.status === 'downloaded') {
      isQuitting = true;
      autoUpdater.quitAndInstall();
      return true;
    }
    return false;
  });

  // Toggle auto-download preference (persisted in config.yaml)
  ipcMain.handle('set-auto-download', (event, enabled) => {
    const config = loadConfig() || {};
    config.updates = config.updates || {};
    config.updates.autoDownload = !!enabled;
    saveConfig(config);
    autoUpdater.autoDownload = !!enabled;
    return true;
  });
}

// ── Sync Engine ─────────────────────────────────────────────────────────────

function startSyncEngine() {
  const config = loadConfig();
  if (!config) return;

  if (syncEngine) {
    syncEngine.stop();
  }

  syncEngine = new SyncEngine({
    config,
    logPath: LOG_PATH,
    statePath: STATE_PATH,
    onStatus: (status) => {
      if (tray) {
        tray.setToolTip(`MultiElectric Sync - ${status}`);
      }
      if (mainWindow) {
        mainWindow.webContents.send('status-update', status);
      }
    },
    onSync: (result) => {
      if (mainWindow) {
        mainWindow.webContents.send('sync-result', result);
      }
    },
  });

  syncEngine.start();
}

// ── Auto Update ─────────────────────────────────────────────────────────────

function setupAutoUpdater() {
  const config = loadConfig() || {};
  const prefAuto = config.updates?.autoDownload;
  autoUpdater.autoDownload = prefAuto !== false; // default true
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    updateState = { status: 'checking', version: null, error: null };
    sendUpdateState();
  });

  autoUpdater.on('update-available', (info) => {
    updateState = {
      status: autoUpdater.autoDownload ? 'downloading' : 'available',
      version: info.version,
      error: null,
    };
    sendUpdateState();
  });

  autoUpdater.on('update-not-available', () => {
    updateState = { status: 'up-to-date', version: app.getVersion(), error: null };
    sendUpdateState();
  });

  autoUpdater.on('error', (err) => {
    updateState = { status: 'error', version: null, error: err.message };
    sendUpdateState();
  });

  autoUpdater.on('update-downloaded', (info) => {
    updateState = { status: 'downloaded', version: info.version, error: null };
    sendUpdateState();
  });

  // Check every 6 hours
  setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify().catch(() => {});
  }, 6 * 60 * 60 * 1000);

  // Initial check after 30 seconds
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify().catch(() => {});
  }, 30000);
}

// ── App Lifecycle ───────────────────────────────────────────────────────────

app.whenReady().then(() => {
  setupIPC();
  createTray();
  createWindow();
  setupAutoUpdater();

  if (isConfigured()) {
    startSyncEngine();
  }
});

app.on('window-all-closed', (e) => {
  // Don't quit when window closes — keep running in tray
  e.preventDefault?.();
});

app.on('before-quit', () => {
  isQuitting = true;
  if (syncEngine) syncEngine.stop();
});

app.on('activate', () => {
  createWindow();
});
