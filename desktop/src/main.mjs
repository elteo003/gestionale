import {
    app, BrowserWindow, Tray, Menu, nativeImage, Notification, ipcMain, shell, safeStorage,
} from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { WebSocket } from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ID = 'it.jeins.gestionale';
const DEFAULT_PROD_API = 'https://gestionale-backand-api.onrender.com';

app.setAppUserModelId(APP_ID);

let mainWindow = null;
let tray = null;
let allowQuit = false;
let notifyWs = null;
let notifyRetry = 0;
let currentToken = null;

function isPackaged() {
    return app.isPackaged;
}

function apiUrl() {
    return (process.env.JEINS_API_URL || (isPackaged() ? DEFAULT_PROD_API : 'http://localhost:3000'))
        .replace(/\/+$/, '');
}

function rendererDevUrl() {
    return process.env.JEINS_RENDERER_URL || 'http://localhost:5173';
}

function rendererIndexPath() {
    if (isPackaged()) {
        return path.join(process.resourcesPath, 'renderer', 'index.html');
    }
    return path.join(__dirname, '..', 'renderer', 'index.html');
}

function tokenPath() {
    return path.join(app.getPath('userData'), 'session.bin');
}

function loadPersistedToken() {
    try {
        const file = tokenPath();
        if (!fs.existsSync(file)) return null;
        const buf = fs.readFileSync(file);
        if (buf.length === 0) return null;
        if (safeStorage.isEncryptionAvailable()) {
            return safeStorage.decryptString(buf);
        }
        return buf.toString('utf8');
    } catch {
        return null;
    }
}

async function persistToken(token) {
    const file = tokenPath();
    if (!token) {
        try { fs.unlinkSync(file); } catch { /* ignore */ }
        return;
    }
    if (safeStorage.isEncryptionAvailable()) {
        fs.writeFileSync(file, safeStorage.encryptString(token));
        return;
    }
    fs.writeFileSync(file, token, 'utf8');
}

function trayIcon() {
    const candidates = [
        path.join(process.resourcesPath, 'icon.png'),
        path.join(__dirname, '..', 'build', 'icon.png'),
    ];
    const png = candidates.find((candidate) => fs.existsSync(candidate));
    if (png) {
        return nativeImage.createFromPath(png).resize({ width: 16, height: 16 });
    }
    return nativeImage.createFromDataURL(
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAPUlEQVR4nGNgGCngPxIfwKqYkYH0AIxY1RClGZcBZBvAgkszyQbg0kySAbhcxUgyjYQ0/ycKRs0YNWNIGwAAO3gECV3nX9sAAAAASUVORK5CYII=',
    );
}

function showWindow() {
    if (!mainWindow) {
        createWindow();
        return;
    }
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
}

function nativeNotify(payload) {
    if (!Notification.isSupported()) return;
    if (mainWindow?.isVisible() && mainWindow.isFocused()) return;
    const title = payload?.title || 'JEINS';
    const body = payload?.body || '';
    const url = payload?.url || payload?.data?.url || '/notifiche';
    const toast = new Notification({ title, body, silent: false });
    toast.on('click', () => {
        showWindow();
        mainWindow?.webContents.send('jeins:navigate', url);
    });
    toast.show();
}

function disconnectNotifyWs() {
    if (notifyWs) {
        try { notifyWs.close(); } catch { /* ignore */ }
        notifyWs = null;
    }
}

function connectNotifyWs(token) {
    disconnectNotifyWs();
    currentToken = token;
    if (!token) return;

    const url = `${apiUrl().replace(/^http/i, 'ws')}/ws`;
    const ws = new WebSocket(url);
    notifyWs = ws;

    ws.on('open', () => {
        notifyRetry = 0;
        ws.send(JSON.stringify({ type: 'auth', token }));
    });

    ws.on('message', (raw) => {
        let data;
        try {
            data = JSON.parse(String(raw));
        } catch {
            return;
        }
        if (data.type === 'notification' && data.payload) {
            nativeNotify(data.payload);
        }
    });

    ws.on('close', () => {
        if (notifyWs === ws) notifyWs = null;
        if (!currentToken) return;
        const delay = Math.min(15_000, 1000 * 2 ** notifyRetry);
        notifyRetry += 1;
        setTimeout(() => {
            if (currentToken) connectNotifyWs(currentToken);
        }, delay);
    });

    ws.on('error', () => {
        /* close gestisce il retry */
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 960,
        minHeight: 640,
        title: 'Gestionale JEINS',
        show: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
        },
    });

    mainWindow.once('ready-to-show', () => mainWindow.show());
    mainWindow.on('close', (event) => {
        if (!allowQuit) {
            event.preventDefault();
            mainWindow.hide();
        }
    });
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    if (!isPackaged()) {
        mainWindow.loadURL(rendererDevUrl());
    } else {
        mainWindow.loadFile(rendererIndexPath());
    }
}

function createTray() {
    tray = new Tray(trayIcon());
    tray.setToolTip('Gestionale JEINS');
    tray.setContextMenu(Menu.buildFromTemplate([
        { label: 'Apri', click: () => showWindow() },
        { type: 'separator' },
        {
            label: 'Esci',
            click: () => {
                allowQuit = true;
                disconnectNotifyWs();
                app.quit();
            },
        },
    ]));
    tray.on('click', () => showWindow());
}

ipcMain.on('jeins:config', (event) => {
    event.returnValue = { apiUrl: apiUrl() };
});

ipcMain.handle('jeins:set-token', async (_event, token) => {
    if (typeof token !== 'string' || !token) return;
    currentToken = token;
    await persistToken(token);
    connectNotifyWs(token);
});

ipcMain.handle('jeins:clear-token', async () => {
    currentToken = null;
    await persistToken(null);
    disconnectNotifyWs();
});

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
    app.quit();
} else {
    app.on('second-instance', () => showWindow());
    app.whenReady().then(() => {
        Menu.setApplicationMenu(null);
        createTray();
        createWindow();
        const saved = loadPersistedToken();
        if (saved) connectNotifyWs(saved);
        app.on('activate', () => showWindow());
    });
}

app.on('before-quit', () => {
    allowQuit = true;
    disconnectNotifyWs();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin' && allowQuit) app.quit();
});
