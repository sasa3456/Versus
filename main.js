// main.js
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let forceQuit = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0f1113',
      symbolColor: '#ffffff',
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
	     devTools: false
    },
    icon: path.join(__dirname, 'assets/icon.png')
  });

  mainWindow.loadFile('src/index.html');
  mainWindow.maximize();
  mainWindow.setMenu(null);
  mainWindow.webContents.openDevTools();

  // Graceful close handler
  mainWindow.on('close', (e) => {
    if (!forceQuit) {
      e.preventDefault();
      mainWindow.webContents.send('on-close-request');
    }
  });
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

// --- IPC Handlers ---

ipcMain.handle('dialog:select-directory', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });
  return !canceled ? filePaths[0] : null;
});

ipcMain.handle('project:create', async (event, projectPath, projectName) => {
  try {
    if (!fs.existsSync(projectPath)) {
      fs.mkdirSync(projectPath, { recursive: true });
    }
    fs.mkdirSync(path.join(projectPath, 'Assets'), { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'Nodes'), { recursive: true });

    const projectFilePath = path.join(projectPath, `${projectName}.v`);
    const projectData = {
      projectName: projectName,
      version: "0.0.1",
      createdAt: new Date().toISOString(),
      objects: [], // Start with an empty scene
      environment: {},
      postprocessing: {}
    };
    fs.writeFileSync(projectFilePath, JSON.stringify(projectData, null, 2));
    return { success: true, path: projectPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('project:open', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [{ name: 'Versus Project', extensions: ['v'] }]
    });

    if (canceled || filePaths.length === 0) return null;

    const filePath = filePaths[0];
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(content);
        return {
            name: data.projectName || path.basename(filePath, '.v'),
            path: path.dirname(filePath),
            data: data
        };
    } catch (error) {
        return { success: false, error: 'Failed to read or parse the project file.' };
    }
});

ipcMain.handle('project:save', async (event, projectFilePath, content) => {
    try {
        fs.writeFileSync(projectFilePath, content);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// New handler for the close confirmation dialog
ipcMain.handle('confirm-close', async () => {
    const choice = await dialog.showMessageBox(mainWindow, {
        type: 'question',
        buttons: ['Save', 'Don\'t Save', 'Cancel'],
        title: 'Confirm',
        message: 'You have unsaved changes. Do you want to save them before closing?',
        defaultId: 0,
        cancelId: 2
    });

    const response = choice.response; // 0: Save, 1: Don't Save, 2: Cancel

    if (response === 0) { // Save
        mainWindow.webContents.send('save-and-quit');
    } else if (response === 1) { // Don't Save
        forceQuit = true;
        app.quit();
    }
    // If response is 2 (Cancel), do nothing.
});

// New handler to force quit after a successful save
ipcMain.on('quit-after-save', () => {
    forceQuit = true;
    app.quit();
});

ipcMain.on('window:close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.close();
});
