// preload.js

const { contextBridge, ipcRenderer } = require('electron');
const path = require('path'); // <-- Import the 'path' module

contextBridge.exposeInMainWorld('electronAPI', {
  // --- Game Window Methods ---
  playGame: (sceneData) => ipcRenderer.send('game:play', sceneData),
  onLoadScene: (callback) => ipcRenderer.on('scene:load', (_event, value) => callback(value)),

  // --- Asset Watcher ---
  projectOpened: (projectPath) => ipcRenderer.send('project:opened', projectPath),
  onAssetChange: (callback) => ipcRenderer.on('asset-changed', (_event, value) => callback(value)),

  // --- Project Management ---
  selectDirectory: () => ipcRenderer.invoke('dialog:select-directory'),
  createProject: (projectPath, projectName) => ipcRenderer.invoke('project:create', projectPath, projectName),
  openProject: () => ipcRenderer.invoke('project:open'),
  saveProject: (filePath, content) => ipcRenderer.invoke('project:save', filePath, content),

  // --- File System API ---
  getAssetsTree: (projectPath) => ipcRenderer.invoke('fs:get-assets-tree', projectPath),
  readDir: (dirPath) => ipcRenderer.invoke('fs:read-dir', dirPath),
  importAsset: (projectPath, sourceFilePath) => ipcRenderer.invoke('fs:import-asset', projectPath, sourceFilePath),
  importAssetToPath: (destFolderPath, sourceFilePath) => ipcRenderer.invoke('fs:import-asset-to-path', destFolderPath, sourceFilePath),

  // --- Window & App Control ---
  closeWindow: () => ipcRenderer.send('window:close'),
  onCloseRequest: (callback) => ipcRenderer.on('on-close-request', callback),
  onSaveAndQuit: (callback) => ipcRenderer.on('save-and-quit', callback),
  confirmClose: () => ipcRenderer.invoke('confirm-close'),
  quitAfterSave: () => ipcRenderer.send('quit-after-save'),
  
  // --- NEW: Expose specific path functions ---
  path: {
    relative: (from, to) => path.relative(from, to),
    sep: path.sep,
    join: (...args) => path.join(...args)
  }
});