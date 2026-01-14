const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  sendMessage: (messageData) => ipcRenderer.invoke("send-message", messageData),

  getTelemetry: () => ipcRenderer.invoke("get-telemetry"),
  startTelemetry: () => ipcRenderer.send("start-telemetry"),
  stopTelemetry: () => ipcRenderer.send("stop-telemetry"),

  getAppInfo: () =>
    new Promise((resolve) => {
      ipcRenderer.send("app-info");
      ipcRenderer.once("app-info-response", (event, data) => resolve(data));
    }),

  onTelemetryData: (callback) => {
    ipcRenderer.on("telemetry-data", (event, data) => callback(data));
  },

  onClearChat: (callback) => {
    ipcRenderer.on("clear-chat", () => callback());
  },

  onClearTelemetry: (callback) => {
    ipcRenderer.on("clear-telemetry", () => callback());
  },

  removeTelemetryListener: () => {
    ipcRenderer.removeAllListeners("telemetry-data");
  },

  platform: process.platform,
});
