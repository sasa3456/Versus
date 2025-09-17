// main.js

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const fsp = require('fs').promises; // Use promises for async operations
const chokidar = require('chokidar'); // <-- Import chokidar

let mainWindow;
let gameWindow; // <-- Handle for the game window
let forceQuit = false;
let assetWatcher = null; // <-- Variable to hold the watcher instance

// Helper function to recursively read a directory
async function readDirRecursive(dirPath) {
    const dirents = await fsp.readdir(dirPath, { withFileTypes: true });
    const files = await Promise.all(dirents.map(async (dirent) => {
        const res = path.resolve(dirPath, dirent.name);
        const isDirectory = dirent.isDirectory();
        return {
            name: dirent.name,
            path: res,
            isDirectory,
            children: isDirectory ? await readDirRecursive(res) : []
        };
    }));
    // Sort directories first, then files
    return files.sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) {
            return a.isDirectory ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
    });
}


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
      sandbox: false, // <-- FIX: Allow preload to use Node.js modules
      devTools: true
    },
    icon: path.join(__dirname, 'assets/icon.png')
  });

  mainWindow.loadFile('src/index.html');
  mainWindow.maximize();
  // mainWindow.setMenu(null);
  mainWindow.webContents.openDevTools();

  mainWindow.on('close', (e) => {
    if (!forceQuit) {
      e.preventDefault();
      mainWindow.webContents.send('on-close-request');
    }
  });
  
  mainWindow.on('closed', () => {
    mainWindow = null;
    if (gameWindow) {
        gameWindow.close();
    }
  });
}

// --- IPC Handler to launch the game window ---
ipcMain.on('game:play', (event, sceneData) => {
    if (gameWindow) {
        gameWindow.focus();
        return;
    }

    gameWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        title: 'Versus Engine - Game',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false, // <-- FIX: Also required for the game window
            devTools: true
        },
        icon: path.join(__dirname, 'assets/icon.png')
    });

    gameWindow.loadFile('src/game.html');
    gameWindow.setMenu(null);
    // gameWindow.webContents.openDevTools();

    // Send scene data once the window is ready
    gameWindow.webContents.on('did-finish-load', () => {
        gameWindow.webContents.send('scene:load', sceneData);
    });

    gameWindow.on('closed', () => {
        gameWindow = null;
    });
});


app.whenReady().then(() => {
  createWindow();
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Clean up the watcher when the app quits
app.on('will-quit', () => {
    if (assetWatcher) {
        assetWatcher.close();
    }
});

ipcMain.on('project:opened', (event, projectPath) => {
    // Close any existing watcher before starting a new one
    if (assetWatcher) {
        assetWatcher.close().then(() => console.log('Previous asset watcher closed.'));
    }

    const assetsPath = path.join(projectPath, 'Assets');
    if (!fs.existsSync(assetsPath)) return;

    console.log(`Starting asset watcher on: ${assetsPath}`);
    assetWatcher = chokidar.watch(assetsPath, {
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        persistent: true,
        ignoreInitial: true, // Don't send events for existing files on startup
    });

    // Listen for all events and forward them to the renderer process
    assetWatcher.on('all', (event, changedPath) => {
        console.log(`Asset change detected: ${event} at ${changedPath}`);
        if (mainWindow) {
            mainWindow.webContents.send('asset-changed', { event, path: changedPath });
        }
    });
});

ipcMain.handle('fs:import-asset-to-path', async(event, destFolderPath, sourceFilePath) => {
    if (!destFolderPath || !sourceFilePath) return { success: false, error: 'Invalid paths provided' };
    
    const fileName = path.basename(sourceFilePath);
    const destPath = path.join(destFolderPath, fileName);

    try {
        if (!fs.existsSync(destFolderPath)) {
             return { success: false, error: 'Destination directory does not exist.' };
        }
        await fsp.copyFile(sourceFilePath, destPath);
        return { success: true, path: destPath, name: fileName };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// --- IPC Handlers ---

ipcMain.handle('fs:get-assets-tree', async (event, projectPath) => {
    const assetsPath = path.join(projectPath, 'Assets');
    if (!fs.existsSync(assetsPath)) return null;
    return readDirRecursive(assetsPath);
});

ipcMain.handle('fs:read-dir', async (event, dirPath) => {
    const dirents = await fsp.readdir(dirPath, { withFileTypes: true });
    const items = dirents.map(dirent => ({
        name: dirent.name,
        path: path.join(dirPath, dirent.name),
        isDirectory: dirent.isDirectory()
    }));
    return items.sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) {
            return a.isDirectory ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
    });
});

ipcMain.handle('fs:import-asset', async(event, projectPath, sourceFilePath) => {
    if (!projectPath || !sourceFilePath) return { success: false, error: 'Invalid paths' };
    const assetsPath = path.join(projectPath, 'Assets');
    const fileName = path.basename(sourceFilePath);
    const destPath = path.join(assetsPath, fileName);
    try {
        await fsp.copyFile(sourceFilePath, destPath);
        return { success: true, path: destPath, name: fileName };
    } catch (error) {
        return { success: false, error: error.message };
    }
});


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
      objects: [],
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

ipcMain.handle('confirm-close', async () => {
    const choice = await dialog.showMessageBox(mainWindow, {
        type: 'question',
        buttons: ['Save', 'Don\'t Save', 'Cancel'],
        title: 'Confirm',
        message: 'You have unsaved changes. Do you want to save them before closing?',
        defaultId: 0,
        cancelId: 2
    });

    const response = choice.response;

    if (response === 0) {
        mainWindow.webContents.send('save-and-quit');
    } else if (response === 1) {
        forceQuit = true;
        app.quit();
    }
});

ipcMain.on('quit-after-save', () => {
    forceQuit = true;
    app.quit();
});

ipcMain.on('window:close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.close();
});