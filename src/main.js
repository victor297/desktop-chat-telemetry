const { app, BrowserWindow, ipcMain, Menu } = require("electron");
const path = require("path");
const TelemetryCollector = require("./telemetry/collector");
const logger = require("./utils/logger");

let mainWindow;
let telemetryCollector;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "renderer/index.html"));

  if (process.env.NODE_ENV === "development") {
    mainWindow.webContents.openDevTools();
  }

  createMenu();
}

function createMenu() {
  const template = [
    {
      label: "File",
      submenu: [
        {
          label: "Clear Chat",
          click: () => {
            mainWindow.webContents.send("clear-chat");
          },
        },
        {
          label: "Clear Telemetry",
          click: () => {
            mainWindow.webContents.send("clear-telemetry");
          },
        },
        { type: "separator" },
        {
          label: "Exit",
          accelerator: "CmdOrCtrl+Q",
          click: () => app.quit(),
        },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { type: "separator" },
        { role: "toggleDevTools" },
      ],
    },
    {
      label: "Telemetry",
      submenu: [
        {
          label: "Start Collection",
          click: () => telemetryCollector.start(),
        },
        {
          label: "Stop Collection",
          click: () => telemetryCollector.stop(),
        },
        {
          label: "Collect Now",
          click: async () => {
            const data = await telemetryCollector.collectTelemetry();
            mainWindow.webContents.send("telemetry-data", data);
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function setupIPC() {
  ipcMain.handle("send-message", async (event, messageData) => {
    logger.log("Message received:", messageData);

    await new Promise((resolve) => setTimeout(resolve, 50));

    return {
      ...messageData,
      id: Date.now(),
      timestamp: new Date().toISOString(),
      status: "sent",
    };
  });

  ipcMain.handle("get-telemetry", async () => {
    return await telemetryCollector.collectTelemetry();
  });

  ipcMain.on("start-telemetry", () => telemetryCollector.start());
  ipcMain.on("stop-telemetry", () => telemetryCollector.stop());

  ipcMain.on("app-info", (event) => {
    event.reply("app-info-response", {
      version: app.getVersion(),
      platform: process.platform,
      arch: process.arch,
    });
  });
}

app.whenReady().then(() => {
  createWindow();

  telemetryCollector = new TelemetryCollector((data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("telemetry-data", data);
    }
  });

  setupIPC();

  telemetryCollector.start();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (telemetryCollector) {
    telemetryCollector.stop();
  }

  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (telemetryCollector) {
    telemetryCollector.stop();
  }
});
