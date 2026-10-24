import express from 'express';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const appRoot = path.dirname(fileURLToPath(import.meta.url));

export async function startOverlayServer({ port = Number(process.env.PORT || 31337), demo = process.argv.includes('--demo') } = {}) {
const app = express();
app.use(express.static(appRoot, { extensions: ['html'] }));
const server = app.listen(port, '127.0.0.1', () => console.log(`OBS Mouse Overlay: http://127.0.0.1:${port}/overlay/`));
const wss = new WebSocketServer({ server });
const state = { x: 0.5, y: 0.5, left: false, right: false, middle: false, moving: false, keys: {} };
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
return server;
}

if (!process.versions.electron) await startOverlayServer();
