class ChatApp {
  constructor() {
    this.messages = [];
    this.telemetryData = [];
    this.isTelemetryRunning = false;
    this.appInfo = null;

    this.initializeElements();
    this.bindEvents();
    this.initializeApp();
  }

  initializeElements() {
    // Chat elements
    this.messageInput = document.getElementById("messageInput");
    this.sendMessageBtn = document.getElementById("sendMessageBtn");
    this.messagesContainer = document.getElementById("messagesContainer");
    this.clearChatBtn = document.getElementById("clearChatBtn");

    // Telemetry elements
    this.toggleTelemetryBtn = document.getElementById("toggleTelemetryBtn");
    this.telemetryStatus = document.getElementById("telemetryStatus");
    this.refreshTelemetryBtn = document.getElementById("refreshTelemetryBtn");
    this.clearTelemetryBtn = document.getElementById("clearTelemetryBtn");

    // Metric displays
    this.cpuMetric = document.getElementById("cpuMetric");
    this.memoryMetric = document.getElementById("memoryMetric");
    this.uptimeMetric = document.getElementById("uptimeMetric");
    this.networkInterfaces = document.getElementById("networkInterfaces");
    this.telemetryLog = document.getElementById("telemetryLog");

    // Status elements
    this.statusMessage = document.getElementById("statusMessage");
    this.lastUpdated = document.getElementById("lastUpdated");
    this.appInfoElement = document.getElementById("appInfo");
  }

  bindEvents() {
    // Chat events
    this.sendMessageBtn.addEventListener("click", () => this.sendMessage());
    this.messageInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.sendMessage();
    });
    this.clearChatBtn.addEventListener("click", () => this.clearChat());

    // Telemetry events
    this.toggleTelemetryBtn.addEventListener("click", () =>
      this.toggleTelemetry()
    );
    this.refreshTelemetryBtn.addEventListener("click", () =>
      this.refreshTelemetry()
    );
    this.clearTelemetryBtn.addEventListener("click", () =>
      this.clearTelemetryLog()
    );

    // IPC events
    window.electronAPI.onTelemetryData((data) =>
      this.handleTelemetryData(data)
    );
    window.electronAPI.onClearChat(() => this.clearChat());
    window.electronAPI.onClearTelemetry(() => this.clearTelemetryLog());
  }

  async initializeApp() {
    try {
      // Get app info
      this.appInfo = await window.electronAPI.getAppInfo();
      this.updateAppInfo();

      // Set initial telemetry status
      this.updateTelemetryStatus(false);

      // Show welcome message
      this.showSystemMessage(
        "Application initialized. Ready to chat and monitor system."
      );

      this.setStatus("Ready");
    } catch (error) {
      console.error("Failed to initialize app:", error);
      this.showSystemMessage(
        "Error initializing application. Some features may not work."
      );
    }
  }

  updateAppInfo() {
    if (this.appInfo) {
      this.appInfoElement.textContent = `${this.appInfo.platform} ${this.appInfo.arch} | v${this.appInfo.version}`;
    }
  }

  async sendMessage() {
    const message = this.messageInput.value.trim();
    if (!message) return;

    // Clear input immediately for responsiveness
    this.messageInput.value = "";

    // Add message to UI immediately
    const messageId = Date.now();
    const userMessage = {
      id: messageId,
      content: message,
      timestamp: new Date().toISOString(),
      sender: "user",
      status: "sending",
    };

    this.addMessageToUI(userMessage);

    try {
      // Send to main process
      const response = await window.electronAPI.sendMessage({
        content: message,
        timestamp: new Date().toISOString(),
      });

      // Update message status
      this.updateMessageStatus(messageId, "sent", response.timestamp);

      // Add system acknowledgement
      setTimeout(() => {
        this.showSystemMessage(
          `Message sent at ${new Date(response.timestamp).toLocaleTimeString()}`
        );
      }, 500);

      this.setStatus("Message sent successfully");
    } catch (error) {
      console.error("Error sending message:", error);
      this.updateMessageStatus(messageId, "error");
      this.showSystemMessage("Failed to send message");
      this.setStatus("Error sending message", "error");
    }
  }

  addMessageToUI(message) {
    const messageElement = document.createElement("div");
    messageElement.className = `message ${
      message.sender === "user" ? "user-message" : "system-message"
    }`;
    messageElement.id = `msg-${message.id}`;

    // Clean content for display
    const cleanContent = this.escapeHtml(String(message.content || ""));

    messageElement.innerHTML = `
        <div class="message-header">
            <span>${message.sender === "user" ? "You" : "System"}</span>
            <span>${new Date(message.timestamp).toLocaleTimeString()}</span>
        </div>
        <div class="message-content">${cleanContent}</div>
        ${
          message.status && message.status !== "sent"
            ? `
            <div class="message-status">
                <small>${
                  message.status === "sending" ? "Sending..." : "Error"
                }</small>
            </div>
        `
            : ""
        }
    `;

    this.messagesContainer.appendChild(messageElement);
    this.scrollToBottom();
  }
  updateMessageStatus(messageId, status, timestamp = null) {
    const messageElement = document.getElementById(`msg-${messageId}`);
    if (messageElement) {
      const header = messageElement.querySelector(".message-header");
      if (timestamp) {
        header.innerHTML = `
                    <span>You</span>
                    <span>${new Date(timestamp).toLocaleTimeString()}</span>
                `;
      }

      const statusElement = messageElement.querySelector(".message-status");
      if (statusElement) {
        statusElement.remove();
      }
    }
  }

  showSystemMessage(content) {
    // Ensure content is a string and clean it
    const cleanContent = String(content).replace(/<[^>]*>/g, "");

    const message = {
      id: Date.now(),
      content: cleanContent,
      timestamp: new Date().toISOString(),
      sender: "system",
      status: "sent",
    };

    // Use the existing message display method
    const messageElement = document.createElement("div");
    messageElement.className = "message system-message";
    messageElement.id = `msg-${message.id}`;
    messageElement.innerHTML = `
        <div class="message-header">
            <span>System</span>
            <span>${new Date(message.timestamp).toLocaleTimeString()}</span>
        </div>
        <div class="message-content">${this.escapeHtml(message.content)}</div>
    `;

    this.messagesContainer.appendChild(messageElement);
    this.scrollToBottom();
  }

  clearChat() {
    this.messagesContainer.innerHTML = `
            <div class="system-message">
                Chat cleared. Start a new conversation!
            </div>
        `;
    this.messages = [];
    this.setStatus("Chat cleared");
  }

  async toggleTelemetry() {
    try {
      if (this.isTelemetryRunning) {
        window.electronAPI.stopTelemetry();
        this.updateTelemetryStatus(false);
        this.showSystemMessage("Telemetry collection stopped");
        this.setStatus("Telemetry stopped");
      } else {
        window.electronAPI.startTelemetry();
        this.updateTelemetryStatus(true);
        this.showSystemMessage("Telemetry collection started (30s interval)");
        this.setStatus("Telemetry started");

        // Get initial data
        await this.refreshTelemetry();
      }
    } catch (error) {
      console.error("Error toggling telemetry:", error);
      this.showSystemMessage("Failed to control telemetry");
      this.setStatus("Error controlling telemetry", "error");
    }
  }

  updateTelemetryStatus(isRunning) {
    this.isTelemetryRunning = isRunning;
    this.telemetryStatus.textContent = isRunning ? "Running" : "Stopped";
    this.telemetryStatus.style.background = isRunning
      ? "linear-gradient(135deg, #4CAF50, #45a049)"
      : "linear-gradient(135deg, #f44336, #d32f2f)";

    this.toggleTelemetryBtn.textContent = isRunning
      ? "Stop Telemetry"
      : "Start Telemetry";
    this.toggleTelemetryBtn.className = isRunning
      ? "btn btn-secondary"
      : "btn btn-primary";
  }

  async refreshTelemetry() {
    try {
      this.setStatus("Refreshing telemetry...");
      const data = await window.electronAPI.getTelemetry();
      this.handleTelemetryData(data);
      this.setStatus("Telemetry refreshed");
    } catch (error) {
      console.error("Error refreshing telemetry:", error);
      this.showSystemMessage("Failed to refresh telemetry data");
      this.setStatus("Error refreshing telemetry", "error");
    }
  }

  handleTelemetryData(data) {
    // Store data
    this.telemetryData.unshift(data);
    if (this.telemetryData.length > 50) {
      this.telemetryData = this.telemetryData.slice(0, 50);
    }

    // Update UI
    this.updateMetricsDisplay(data);
    this.updateTelemetryLog(data);
    this.updateLastUpdated(data.timestamp);
  }

  updateMetricsDisplay(data) {
    // CPU
    if (data.cpu) {
      const cpuUsage = data.cpu.usage || 0;
      this.cpuMetric.querySelector(
        ".metric-value"
      ).textContent = `${cpuUsage}%`;
      this.cpuMetric.querySelector(".metric-details").textContent = `Cores: ${
        data.cpu.cores || "N/A"
      }`;

      // Add gauge
      let gauge = this.cpuMetric.querySelector(".cpu-gauge-fill");
      if (!gauge) {
        const gaugeContainer = document.createElement("div");
        gaugeContainer.className = "cpu-gauge";
        gaugeContainer.innerHTML = '<div class="cpu-gauge-fill"></div>';
        this.cpuMetric.appendChild(gaugeContainer);
        gauge = gaugeContainer.querySelector(".cpu-gauge-fill");
      }
      gauge.style.width = `${cpuUsage}%`;
    }

    // Memory
    if (data.memory) {
      const memUsage = data.memory.usage || 0;
      this.memoryMetric.querySelector(
        ".metric-value"
      ).textContent = `${memUsage}%`;
      this.memoryMetric.querySelector(".metric-details").textContent = `Used: ${
        data.memory.used || "N/A"
      }`;

      // Add gauge
      let gauge = this.memoryMetric.querySelector(".memory-gauge-fill");
      if (!gauge) {
        const gaugeContainer = document.createElement("div");
        gaugeContainer.className = "memory-gauge";
        gaugeContainer.innerHTML = '<div class="memory-gauge-fill"></div>';
        this.memoryMetric.appendChild(gaugeContainer);
        gauge = gaugeContainer.querySelector(".memory-gauge-fill");
      }
      gauge.style.width = `${memUsage}%`;
    }

    // System uptime
    if (data.system) {
      const uptime = data.system.uptime || 0;
      const uptimeStr = this.formatUptime(uptime);
      this.uptimeMetric.querySelector(".metric-value").textContent = uptimeStr;
      this.uptimeMetric.querySelector(".metric-details").textContent = `Host: ${
        data.system.hostname || "N/A"
      }`;
    }

    // Network interfaces
    if (data.network && data.network.interfaces) {
      this.updateNetworkInterfaces(data.network.interfaces);
    }
  }

  updateNetworkInterfaces(interfaces) {
    if (!interfaces || interfaces.length === 0) {
      this.networkInterfaces.innerHTML =
        '<div class="no-data">No network interfaces found</div>';
      return;
    }

    this.networkInterfaces.innerHTML = interfaces
      .map((iface) => {
        const typeClass =
          iface.type === "Wi-Fi"
            ? "wifi"
            : iface.type === "Ethernet"
            ? "ethernet"
            : "unknown";

        return `
                <div class="interface-card">
                    <div class="interface-header">
                        <div class="interface-name">
                            ${iface.type === "Wi-Fi" ? "📶" : "🔌"}
                            ${iface.name || "Unknown"}
                        </div>
                        <span class="interface-type ${typeClass}">
                            ${iface.type || "Unknown"}
                        </span>
                    </div>
                    <div class="interface-details">
                        ${
                          iface.mac
                            ? `
                            <div class="detail-item">
                                <span class="detail-label">MAC Address</span>
                                <span class="detail-value">${iface.mac}</span>
                            </div>
                        `
                            : ""
                        }
                        
                        ${
                          iface.ip4
                            ? `
                            <div class="detail-item">
                                <span class="detail-label">IPv4 Address</span>
                                <span class="detail-value">${iface.ip4}</span>
                            </div>
                        `
                            : ""
                        }
                        
                        ${
                          iface.speed
                            ? `
                            <div class="detail-item">
                                <span class="detail-label">Speed</span>
                                <span class="detail-value">${iface.speed} Mbps</span>
                            </div>
                        `
                            : ""
                        }
                        
                        ${
                          iface.driver
                            ? `
                            <div class="detail-item">
                                <span class="detail-label">Driver</span>
                                <span class="detail-value">${
                                  iface.driver.description || "Unknown"
                                }</span>
                            </div>
                        `
                            : ""
                        }
                        
                        ${
                          iface.lastUpdated
                            ? `
                            <div class="detail-item">
                                <span class="detail-label">Last Updated</span>
                                <span class="detail-value">${new Date(
                                  iface.lastUpdated
                                ).toLocaleTimeString()}</span>
                            </div>
                        `
                            : ""
                        }
                    </div>
                </div>
            `;
      })
      .join("");
  }

  updateTelemetryLog(data) {
    const time = new Date(data.timestamp).toLocaleTimeString();
    const message = data.error
      ? `❌ Error: ${data.error}`
      : `✅ Collected: CPU ${data.cpu?.usage || 0}%, Memory ${
          data.memory?.usage || 0
        }%`;

    const logEntry = document.createElement("div");
    logEntry.className = "log-entry";
    logEntry.innerHTML = `
            <span class="log-time">${time}</span>
            <span class="log-message">${message}</span>
        `;

    // Add to top
    this.telemetryLog.insertBefore(logEntry, this.telemetryLog.firstChild);

    // Limit log entries
    if (this.telemetryLog.children.length > 20) {
      this.telemetryLog.removeChild(this.telemetryLog.lastChild);
    }
  }

  clearTelemetryLog() {
    this.telemetryLog.innerHTML = `
            <div class="log-entry">
                <span class="log-time">--:--:--</span>
                <span class="log-message">Telemetry log cleared</span>
            </div>
        `;
    this.setStatus("Telemetry log cleared");
  }

  updateLastUpdated(timestamp) {
    const time = new Date(timestamp).toLocaleTimeString();
    this.lastUpdated.textContent = `Last updated: ${time}`;
  }

  setStatus(message, type = "info") {
    this.statusMessage.textContent = message;
    this.statusMessage.style.color = type === "error" ? "#dc3545" : "#6c757d";
  }

  scrollToBottom() {
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.chatApp = new ChatApp();
});
