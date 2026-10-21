const { app, BrowserWindow, session, Menu, protocol, net, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

function extractHsndPath(argv) {
  return argv.find(arg => typeof arg === 'string' && arg.endsWith('.hsnd')) || null;
}

let pendingFilePath = null;

function createWindow() {
  const iconPath = app.isPackaged
    ? path.join(app.getAppPath(), 'build/icon.png')
    : path.join(__dirname, 'build/icon.png');

  const win = new BrowserWindow({
    width: 1100,
    height: 900,
    autoHideMenuBar: true,
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // DEV MODE
  //win.webContents.openDevTools();
  Menu.setApplicationMenu(null);

  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') callback(true);
    else callback(false);
  });

  win.webContents.on('did-finish-load', () => {
    if (pendingFilePath) {
      win.webContents.send('open-hsnd-file', pendingFilePath);
      pendingFilePath = null;
    }
  });

  win.loadURL('app://bundle/index.html');
  return win;
}

ipcMain.handle('app:get-version', () => app.getVersion());

ipcMain.handle('app:open-external', async (_event, url) => {
  if (typeof url !== 'string') return false;
  if (!url.startsWith('https://')) return false;
  await shell.openExternal(url);
  return true;
});

ipcMain.handle('read-text-file', async (_event, filePath) => {
  if (typeof filePath !== 'string' || !filePath.endsWith('.hsnd')) {
    throw new Error('Invalid file type');
  }
  return fs.promises.readFile(filePath, 'utf-8');
});

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, commandLine) => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
    const file = extractHsndPath(commandLine);
    if (file && win) {
      win.webContents.send('open-hsnd-file', path.resolve(file));
    }
  });

  app.whenReady().then(() => {
    const RENDERER_ROOT = path.join(__dirname, 'renderer');

    protocol.handle('app', (req) => {
      const url = new URL(req.url);
      const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
      const filePath = path.join(RENDERER_ROOT, rel);
      return net.fetch(pathToFileURL(filePath).toString());
    });

    const initialFile = extractHsndPath(process.argv);
    if (initialFile) pendingFilePath = path.resolve(initialFile);

    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
