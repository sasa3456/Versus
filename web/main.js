const { app, BrowserWindow, ipcMain } = require("electron"); // Добавляем ipcMain
const path = require("path");
const { endianness } = require("os");
const { spawn } = require("child_process");

const target = "build/Debug/ren.exe";

const startNewProcess = (hwnd) => {
  const data = endianness() == "LE" ? hwnd.readInt32LE() : hwnd.readInt32BE();
  const p = spawn(target, [data], {
    cwd: process.cwd(),
  });
  p.stdout.on("data", (data) => {
    console.log(`[native side] ${data}`);
  });
  p.stderr.on("data", (data) => {
    console.log(`[native side] ${data}`);
  });
};

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
    fullscreen: true,
    autoHideMenuBar: true,
    // Укажите путь к вашей иконке.
    // Убедитесь, что 'build/icon.png' существует.
    icon: path.join(__dirname, 'web/icon.png'),
  });

  win.loadFile(path.join(__dirname, "app.html"));
  win.webContents.setFrameRate(60);
  win.on("ready-to-show", () => {
    const hwnd = win.getNativeWindowHandle();
    startNewProcess(hwnd);
  });

  // Добавляем обработчик для закрытия окна
  ipcMain.on('close-window', (event) => {
    const webContents = event.sender;
    const win = BrowserWindow.fromWebContents(webContents);
    win.close();
  });
};

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});