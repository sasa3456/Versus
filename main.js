const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // Optional: for secure IPC
      nodeIntegration: false,
	  //contextIsolation: false, // в зависимости от вашего кода
      //devTools: false // <-- Отключаем DevTools для рендерера
    },
    icon: path.join(__dirname, 'assets/icon.png') // Optional: add an app icon
  });
  // Load the index.html of the app.
  mainWindow.loadFile('src/index.html');

  // Maximize the window
  mainWindow.maximize();
  // Remove the menu
  mainWindow.setMenu(null);


  // Open the DevTools for debugging.
  mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});