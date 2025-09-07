const { contextBridge, ipcRenderer } = require('electron');

// "Выставляем" безопасные API в мир рендерера (в ваше веб-приложение)
contextBridge.exposeInMainWorld('electronAPI', {
  // API для закрытия окна (уже было у вас)
  closeWindow: () => ipcRenderer.send('close-window'),
  
  // Новое API: отправка координат и размеров вьюпорта в главный процесс
  sendViewportRect: (rect) => ipcRenderer.send('viewport-rect', rect)
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
