const { app, BrowserWindow, Tray, Menu, ipcMain, dialog, nativeImage } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const SyncEngine = require('./sync-engine');

// ── Paths ───────────────────────────────────────────────────────────────────

const USER_DATA = app.getPath('userData');
const CONFIG_PATH = path.join(USER_DATA, 'config.yaml');
const LOG_PATH = path.join(USER_DATA, 'sync.log');
const STATE_PATH = path.join(USER_DATA, '.sync-state.json');

let mainWindow = null;
let tray = null;
let syncEngine = null;
let isQuitting = false;

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
    state: STATE_PATH,
    userData: USER_DATA,
  }));
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
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    if (mainWindow) {
      mainWindow.webContents.send('update-available', info.version);
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    if (mainWindow) {
      mainWindow.webContents.send('update-downloaded', info.version);
    }
  });

  // Check every 6 hours
  setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 6 * 60 * 60 * 1000);

  // Initial check after 30 seconds
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify();
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
