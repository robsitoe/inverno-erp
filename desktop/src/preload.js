'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('inverno', {
  test: url => ipcRenderer.invoke('server:test', url),
  save: url => ipcRenderer.invoke('server:save', url),
  retry: () => ipcRenderer.invoke('server:retry'),
  change: () => ipcRenderer.invoke('server:change'),
});
