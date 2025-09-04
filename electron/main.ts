import { app, BrowserWindow, ipcMain, clipboard } from 'electron';
import { join, dirname } from 'path';
import { promises as fs } from 'fs';

let mainWindow: BrowserWindow | null = null;

// Simple JSON file-based KV store in userData (values are expected to be encrypted by renderer)
let kvLoaded = false;
let kvCache: Record<string, string> = {};
const getKvFilePath = () => join(app.getPath('userData'), 'kv-store.json');

async function loadKV() {
  if (kvLoaded) return;
  try {
    const p = getKvFilePath();
    const data = await fs.readFile(p, 'utf-8');
    kvCache = JSON.parse(data || '{}');
  } catch {
    kvCache = {};
  } finally {
    kvLoaded = true;
  }
}

async function saveKV() {
  const p = getKvFilePath();
  try {
    await fs.mkdir(dirname(p), { recursive: true });
  } catch {}
  await fs.writeFile(p, JSON.stringify(kvCache, null, 2), 'utf-8');
}

// Helpers for Images
const IMAGE_REF_PREFIX = 'lmimg:';
const getImagesDir = () => join(app.getPath('userData'), 'images');

function genId() {
  try {
    // @ts-ignore
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  } catch {}
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function extFromMime(mime: string): string {
  switch (mime) {
    case 'image/png': return 'png';
    case 'image/jpeg': return 'jpg';
    case 'image/jpg': return 'jpg';
    case 'image/webp': return 'webp';
    case 'image/gif': return 'gif';
    case 'image/svg+xml': return 'svg';
    default: return 'bin';
  }
}

function mimeFromExt(ext: string): string {
  switch (ext) {
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'webp': return 'image/webp';
    case 'gif': return 'image/gif';
    case 'svg': return 'image/svg+xml';
    default: return 'application/octet-stream';
  }
}

async function findImageFileById(id: string): Promise<{ path: string; mime: string } | null> {
  const dir = getImagesDir();
  const candidates = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bin'];
  for (const ext of candidates) {
    const p = join(dir, `${id}.${ext}`);
    try {
      await fs.access(p);
      return { path: p, mime: mimeFromExt(ext) };
    } catch {}
  }
  return null;
}

function parseDataUrl(dataUrl: string): { mime: string; base64: string } | null {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!m) return null;
  return { mime: m[1], base64: m[2] };
}

function safeFromBase64(base64: string): Buffer {
  return Buffer.from(base64, 'base64');
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: {
      preload: join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    // In production, load the built index.html
    mainWindow.loadFile(join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Minimal secure IPC example
ipcMain.handle('ping', () => 'pong');

// KV IPCs (renderer passes/receives strings; encryption is handled in renderer)
ipcMain.handle('kv:get', async (_e, key: unknown) => {
  if (typeof key !== 'string') return null;
  await loadKV();
  return kvCache[key] ?? null;
});

ipcMain.handle('kv:set', async (_e, key: unknown, value: unknown) => {
  if (typeof key !== 'string' || typeof value !== 'string') return false;
  await loadKV();
  kvCache[key] = value;
  await saveKV();
  return true;
});

ipcMain.handle('kv:remove', async (_e, key: unknown) => {
  if (typeof key !== 'string') return false;
  await loadKV();
  delete kvCache[key];
  await saveKV();
  return true;
});

// Images IPCs: save from DataURL, get by ref, delete by ref
ipcMain.handle('images:saveDataURL', async (_e, dataUrl: unknown) => {
  if (typeof dataUrl !== 'string') return null;
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) return null;
  const id = genId();
  const ext = extFromMime(parsed.mime);
  const dir = getImagesDir();
  try { await fs.mkdir(dir, { recursive: true }); } catch {}
  const p = join(dir, `${id}.${ext}`);
  await fs.writeFile(p, safeFromBase64(parsed.base64));
  return IMAGE_REF_PREFIX + id;
});

ipcMain.handle('images:get', async (_e, ref: unknown) => {
  if (typeof ref !== 'string' || !ref.startsWith(IMAGE_REF_PREFIX)) return null;
  const id = ref.slice(IMAGE_REF_PREFIX.length);
  const file = await findImageFileById(id);
  if (!file) return null;
  const buf = await fs.readFile(file.path);
  return { mime: file.mime, base64: buf.toString('base64') };
});

ipcMain.handle('images:delete', async (_e, ref: unknown) => {
  if (typeof ref !== 'string' || !ref.startsWith(IMAGE_REF_PREFIX)) return false;
  const id = ref.slice(IMAGE_REF_PREFIX.length);
  const file = await findImageFileById(id);
  if (!file) return false;
  try {
    await fs.unlink(file.path);
    return true;
  } catch {
    return false;
  }
});

// Clipboard IPCs: restricted access (clear only)
ipcMain.handle('clipboard:clear', async () => {
  try {
    clipboard.clear();
    return true;
  } catch {
    return false;
  }
});

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});