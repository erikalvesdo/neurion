const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getVersion:     () => ipcRenderer.invoke('get-version'),
  installUpdate:  () => ipcRenderer.invoke('install-update'),
  checkUpdate:    () => ipcRenderer.invoke('check-update'),
  platform: process.platform,
  isElectron: true,
  openAI: {
    hasKey:        () => ipcRenderer.invoke('openai-key-has'),
    saveKey:       (apiKey) => ipcRenderer.invoke('openai-key-save', apiKey),
    clearKey:      () => ipcRenderer.invoke('openai-key-clear'),
    validateKey:   (apiKey) => ipcRenderer.invoke('openai-key-validate', apiKey),
    generateText:  (payload) => ipcRenderer.invoke('openai-generate-text', payload),
    generateImage: (payload) => ipcRenderer.invoke('openai-generate-image', payload),
    generateEmbedding: (payload) => ipcRenderer.invoke('openai-generate-embedding', payload),
  },

  onUpdateAvailable:  (cb) => ipcRenderer.on('update-available', (_, data) => cb(data)),
  onUpdateDownloaded: (cb) => ipcRenderer.on('update-downloaded', (_, data) => cb(data)),
  onUpdateProgress:   (cb) => ipcRenderer.on('update-progress', (_, data) => cb(data)),
});
