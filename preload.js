const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Project management
  selectDirectory: () => ipcRenderer.invoke('dialog:select-directory'),
  createProject: (projectPath, projectName) => ipcRenderer.invoke('project:create', projectPath, projectName),
  openProject: () => ipcRenderer.invoke('project:open'),
  saveProject: (filePath, content) => ipcRenderer.invoke('project:save', filePath, content),

  closeWindow: () => ipcRenderer.send('window:close'),
  // Graceful close handling
  onCloseRequest: (callback) => ipcRenderer.on('on-close-request', callback),
  onSaveAndQuit: (callback) => ipcRenderer.on('save-and-quit', callback),
  confirmClose: () => ipcRenderer.invoke('confirm-close'),
  quitAfterSave: () => ipcRenderer.send('quit-after-save'),
});

// Этот код можно оставить, если он вам нужен
window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const dependency of ['chrome', 'node', 'electron']) {
    replaceText(`${dependency}-version`, process.versions[dependency])
  }

  const closeButton = document.getElementById('close-button');
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      window.electronAPI.closeWindow();
    });
  }
});
