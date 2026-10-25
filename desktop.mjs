import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startOverlayServer } from './server.mjs';

let server;
const port = 31337;
const url = `http://127.0.0.1:${port}`;

app.whenReady().then(async () => {
  const unpacked = app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar.unpacked')
    : path.dirname(fileURLToPath(import.meta.url));
  server = await startOverlayServer({ port, settingsDirectory: app.getPath('userData'), resourceRoot: unpacked });
  const window = new BrowserWindow({ width: 780, height: 650, minWidth: 780, minHeight: 650, autoHideMenuBar: true, webPreferences: { nodeIntegration: false } });
  await window.loadURL(`${url}/settings/`);
});
app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => server?.close());
