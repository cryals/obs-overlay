import express from 'express';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const appRoot = path.dirname(fileURLToPath(import.meta.url));
const execute = promisify(execFile);
const defaults = { musicSource: 'auto', skin: 'pickme' };

function loadSettings(settingsFile) {
  try { return { ...defaults, ...JSON.parse(fs.readFileSync(settingsFile, 'utf8')) }; }
  catch { return { ...defaults }; }
}

async function readMedia(scriptPath, source) {
  const readerPath = path.join(path.dirname(scriptPath), 'reader', 'PickMe.MusicReader.exe');
  const command = fs.existsSync(readerPath) ? readerPath : 'powershell.exe';
  const args = fs.existsSync(readerPath) ? [source] : ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, '-Source', source];
  const { stdout } = await execute(command, args, { windowsHide: true, timeout: 4000, maxBuffer: 3 * 1024 * 1024 });
  return JSON.parse(stdout);
}

export async function startOverlayServer({ port = Number(process.env.PORT || 31337), demo = process.argv.includes('--demo'), settingsDirectory = appRoot, resourceRoot = appRoot } = {}) {
const app = express();
const settingsFile = path.join(settingsDirectory, 'pickme-settings.json');
const mediaScript = path.join(resourceRoot, 'music', 'media-session.ps1');
let settings = loadSettings(settingsFile);
let mediaRequestPending = false;
app.use(express.static(appRoot, { extensions: ['html'] }));
app.use(express.json());
const server = app.listen(port, '127.0.0.1', () => console.log(`OBS Mouse Overlay: http://127.0.0.1:${port}/overlay/`));
const wss = new WebSocketServer({ server });
const state = { x: 0.5, y: 0.5, left: false, right: false, middle: false, moving: false, keys: {}, music: { available: false }, settings };
let lastMove = 0;
wss.on('connection', (client) => client.send(JSON.stringify(state)));

function send() {
  const message = JSON.stringify(state);
  for (const client of wss.clients) if (client.readyState === client.OPEN) client.send(message);
}
function updatePosition(x, y) {
  // uiohook reports virtual-screen pixel coordinates. A deliberately broad virtual
  // desktop mapping still gives a graceful relative cursor when monitor metadata is unavailable.
  state.x = Math.max(0, Math.min(1, x / 1920));
  state.y = Math.max(0, Math.min(1, y / 1080));
  state.moving = true;
  lastMove = Date.now();
  send();
}
function setButton(button, value) {
  if (button === 1) state.left = value;
  if (button === 2) state.right = value;
  if (button === 3) state.middle = value;
  send();
}

app.get('/api/settings', (_request, response) => response.json(settings));
app.put('/api/settings', (request, response) => {
  settings = { ...settings, musicSource: ['auto', 'spotify', 'other'].includes(request.body.musicSource) ? request.body.musicSource : 'auto', skin: ['pickme', 'dark'].includes(request.body.skin) ? request.body.skin : 'pickme' };
  state.settings = settings;
  fs.mkdirSync(settingsDirectory, { recursive: true });
  fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
  send();
  response.json(settings);
});

if (demo) {
  setInterval(() => updatePosition(960 + Math.cos(Date.now() / 650) * 700, 540 + Math.sin(Date.now() / 870) * 380), 16);
  setInterval(() => { state.left = !state.left; state.right = false; state.middle = false; send(); }, 1600);
} else {
  try {
    const { uIOhook } = await import('uiohook-napi');
    uIOhook.on('mousemove', (event) => updatePosition(event.x, event.y));
    uIOhook.on('mousedown', (event) => setButton(Number(event.button), true));
    uIOhook.on('mouseup', (event) => setButton(Number(event.button), false));
    uIOhook.on('keydown', (event) => { state.keys[event.keycode] = true; send(); });
    uIOhook.on('keyup', (event) => { state.keys[event.keycode] = false; send(); });
    uIOhook.start();
  } catch (error) {
    console.error('Global mouse hook could not start. Run `npm run demo` to preview.', error.message);
  }
}
setInterval(() => {
  if (state.moving && Date.now() - lastMove > 85) { state.moving = false; send(); }
}, 50);
setInterval(async () => {
  if (mediaRequestPending) return;
  mediaRequestPending = true;
  try { state.music = await readMedia(mediaScript, settings.musicSource); }
  catch (error) { state.music = { available: false, error: error.message }; }
  finally { mediaRequestPending = false; }
  send();
}, 1500);
return server;
}

if (!process.versions.electron) await startOverlayServer();
