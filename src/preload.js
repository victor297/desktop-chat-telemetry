const { contextBridge, ipcRenderer } = require("electron");

// Expose protected methods that allow the renderer to use the ipcRenderer
// without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
  // Chat functions
  sendMessage: (messageData) => ipcRenderer.invoke("send-message", messageData),

  // Telemetry functions
  getTelemetry: () => ipcRenderer.invoke("get-telemetry"),
  startTelemetry: () => ipcRenderer.send("start-telemetry"),
  stopTelemetry: () => ipcRenderer.send("stop-telemetry"),

  // App info
  getAppInfo: () =>
    new Promise((resolve) => {
      ipcRenderer.send("app-info");
      ipcRenderer.once("app-info-response", (event, data) => resolve(data));
    }),

  // Events
  onTelemetryData: (callback) => {
    ipcRenderer.on("telemetry-data", (event, data) => callback(data));
  },

  onClearChat: (callback) => {
    ipcRenderer.on("clear-chat", () => callback());
  },

  onClearTelemetry: (callback) => {
    ipcRenderer.on("clear-telemetry", () => callback());
  },

  // Remove listeners
  removeTelemetryListener: () => {
    ipcRenderer.removeAllListeners("telemetry-data");
  },

  // Utility
  platform: process.platform,
});
