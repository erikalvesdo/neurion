const { app, BrowserWindow, shell, ipcMain, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// ─── EMBEDDED KEY SYSTEM ─────────────────────────────────────────────
// The encrypted key is compiled into _bundled.js during build (prebuild step).
// It lives inside the asar archive — invisible in the install folder.
// On first run, we decrypt and seed it into safeStorage automatically.
let EMBEDDED_PAYLOAD = '';
try {
  const bundled = require('./_bundled.js');
  EMBEDDED_PAYLOAD = bundled.EMBEDDED_PAYLOAD || '';
} catch (_) {
  // _bundled.js not found — no embedded key (dev mode or build without key)
}

function decryptEmbeddedKey(payload) {
  if (!payload) return '';
  try {
    const DERIVE_MATERIAL = 'NEURION-OS-v26-EMBED-' + require('../package.json').version;
    const DERIVED_KEY = crypto.createHash('sha256').update(DERIVE_MATERIAL).digest();
    const [ivHex, encryptedHex] = payload.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', DERIVED_KEY, iv);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Failed to decrypt embedded key:', err.message);
    return '';
  }
}

function seedEmbeddedKeyIfNeeded() {
  // Only seed if: (1) we have an embedded payload AND (2) no key is saved yet
  if (!EMBEDDED_PAYLOAD) return;
  const keyPath = getOpenAIKeyPath();
  if (fs.existsSync(keyPath)) return; // user already has a key — don't overwrite

  const decryptedKey = decryptEmbeddedKey(EMBEDDED_PAYLOAD);
  if (decryptedKey) {
    try {
      writeOpenAIKey(decryptedKey);
      console.log('[NEURION] Embedded API key seeded into safeStorage.');
    } catch (err) {
      console.error('[NEURION] Failed to seed embedded key:', err.message);
    }
  }
}

let mainWindow;

function getOpenAIKeyPath() {
  return path.join(app.getPath('userData'), 'openai-key.bin');
}

function readOpenAIKey() {
  try {
    const keyPath = getOpenAIKeyPath();
    if (fs.existsSync(keyPath)) {
      const encrypted = fs.readFileSync(keyPath);
      if (safeStorage.isEncryptionAvailable()) {
        return safeStorage.decryptString(encrypted);
      }
      return encrypted.toString('utf8');
    }
    return '';
  } catch {
    return '';
  }
}

function writeOpenAIKey(apiKey) {
  const cleanKey = String(apiKey || '').trim();
  if (!cleanKey) throw new Error('OpenAI key is empty');
  const keyPath = getOpenAIKeyPath();
  const payload = safeStorage.isEncryptionAvailable()
    ? safeStorage.encryptString(cleanKey)
    : Buffer.from(cleanKey, 'utf8');
  fs.mkdirSync(path.dirname(keyPath), { recursive: true });
  fs.writeFileSync(keyPath, payload);
}

function clearOpenAIKey() {
  try {
    fs.rmSync(getOpenAIKeyPath(), { force: true });
  } catch {}
}

async function validateOpenAIKey(apiKey) {
  const key = String(apiKey || readOpenAIKey() || '').trim();
  if (!key) return false;
  const response = await fetch('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${key}` },
  });
  return response.ok;
}

async function requestOpenAIText(payload) {
  const key = readOpenAIKey();
  if (!key) throw new Error('OpenAI key not configured');

  const messages = [];
  if (payload.systemInstruction) {
    messages.push({ role: 'system', content: payload.systemInstruction });
  }

  const contents = Array.isArray(payload.contents)
    ? payload.contents.map((part) => {
        if (part.text) return { type: 'text', text: part.text };
        return {
          type: 'image_url',
          image_url: {
            url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
          },
        };
      })
    : payload.contents;

  messages.push({ role: 'user', content: contents });

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: payload.model || 'gpt-5.1',
      messages,
      temperature: payload.temperature ?? 0.7,
      response_format: payload.jsonMode ? { type: 'json_object' } : undefined,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || 'OpenAI text request failed');
  }
  return data?.choices?.[0]?.message?.content || '';
}

async function requestOpenAIImage(payload) {
  const key = readOpenAIKey();
  if (!key) throw new Error('OpenAI key not configured');

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt: payload.prompt,
      size: payload.size || '1024x1024',
      quality: payload.quality || 'medium',
      n: 1,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || 'OpenAI image request failed');
  }

  const base64 = data?.data?.[0]?.b64_json;
  return base64 ? `data:image/png;base64,${base64}` : data?.data?.[0]?.url || null;
}

async function requestOpenAIEmbedding(payload) {
  const key = readOpenAIKey();
  if (!key) throw new Error('OpenAI key not configured');

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: payload.input || '',
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || 'OpenAI embedding request failed');
  }

  return data?.data?.[0]?.embedding || [];
}

// ─── AUTO UPDATER ────────────────────────────────────────────────────
function setupAutoUpdater() {
  if (isDev) return;

  try {
    const { autoUpdater } = require('electron-updater');

    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.allowDowngrade = false;

    // Check for updates 5 seconds after launch
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(() => {});
    }, 5000);

    // Re-check every 2 hours
    setInterval(() => {
      autoUpdater.checkForUpdates().catch(() => {});
    }, 2 * 60 * 60 * 1000);

    autoUpdater.on('update-available', (info) => {
      mainWindow?.webContents.send('update-available', {
        version: info.version,
        releaseNotes: info.releaseNotes || ''
      });
    });

    autoUpdater.on('update-downloaded', (info) => {
      mainWindow?.webContents.send('update-downloaded', {
        version: info.version
      });
    });

    autoUpdater.on('download-progress', (progress) => {
      mainWindow?.webContents.send('update-progress', {
        percent: Math.round(progress.percent),
        bytesPerSecond: progress.bytesPerSecond,
        transferred: progress.transferred,
        total: progress.total
      });
    });

    autoUpdater.on('error', (err) => {
      console.log('AutoUpdater error:', err.message);
    });

    ipcMain.handle('install-update', () => {
      autoUpdater.quitAndInstall(false, true);
    });

    ipcMain.handle('check-update', () => {
      autoUpdater.checkForUpdates().catch(() => {});
    });

  } catch (err) {
    console.log('electron-updater not available:', err.message);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1024, minHeight: 700,
    fullscreen: true,
    title: 'NEURION OS',
    icon: path.join(__dirname, '../icon.ico'),
    backgroundColor: '#020408',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, webSecurity: false,
    },
    show: false,
  });

  mainWindow.setMenuBarVisibility(false);

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
    setupAutoUpdater();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  seedEmbeddedKeyIfNeeded();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('get-version', () => app.getVersion());
ipcMain.handle('openai-key-has', () => !!readOpenAIKey());
ipcMain.handle('openai-key-save', async (_event, apiKey) => {
  writeOpenAIKey(apiKey);
  return true;
});
ipcMain.handle('openai-key-clear', () => {
  clearOpenAIKey();
  return true;
});
ipcMain.handle('openai-key-validate', async (_event, apiKey) => validateOpenAIKey(apiKey));
ipcMain.handle('openai-generate-text', async (_event, payload) => requestOpenAIText(payload));
ipcMain.handle('openai-generate-image', async (_event, payload) => requestOpenAIImage(payload));
ipcMain.handle('openai-generate-embedding', async (_event, payload) => requestOpenAIEmbedding(payload));
