import { app, BrowserWindow, shell } from 'electron';
import { startOverlayServer } from './server.mjs';

let server;
const port = 31337;
const url = `http://127.0.0.1:${port}`;

function instructions() {
  return `<!doctype html><meta charset="utf-8"><title>PickMe Overlay</title>
  <style>body{margin:0;background:#21142c;color:#fff3ff;font:16px/1.5 system-ui;padding:28px}h1{color:#ff97dc}code{background:#3d244d;padding:3px 6px;border-radius:5px}li{margin:8px 0}.ok{color:#67efcb;font-weight:700}button{border:0;border-radius:9px;padding:10px 14px;background:#ff6fca;color:#301126;font-weight:800;cursor:pointer}</style>
  <h1>PickMe Overlay</h1><p class="ok">● Работает — сервер запущен на ${url}</p>
  <p>В OBS добавь два Browser Source, оба <b>512 × 512</b>:</p><ol><li>Мышка: <code>${url}/overlay/</code></li><li>Клавиатура: <code>${url}/keyboard/</code></li></ol>
  <p><b>Важно:</b> в свойствах каждого Browser Source полностью удали дефолтный CSS OBS из поля <i>Custom CSS</i>. Оставь поле пустым, иначе OBS может добавить фон, отступы или сломать прозрачность.</p>
  <p>Включи «Refresh browser when scene becomes active». Это portable EXE: установка не нужна — держи программу открытой во время записи.</p>
  <button onclick="window.open('${url}/keyboard/')">Открыть предпросмотр клавиатуры</button>`;
}

app.whenReady().then(async () => {
  server = await startOverlayServer({ port });
  const window = new BrowserWindow({ width: 700, height: 530, resizable: false, autoHideMenuBar: true, webPreferences: { nodeIntegration: false } });
  await window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(instructions())}`);
});
app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => server?.close());
