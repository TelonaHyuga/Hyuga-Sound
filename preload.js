const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),
  openExternal: (url) => ipcRenderer.invoke('app:open-external', url),
  readTextFile: (p) => ipcRenderer.invoke('read-text-file', p),
  onOpenHsndFile: (callback) => {
    ipcRenderer.on('open-hsnd-file', (_event, filePath) => callback(filePath));
  },
});
