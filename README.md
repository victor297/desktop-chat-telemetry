# Desktop Chat & System Telemetry

A minimal Electron desktop application that demonstrates safe system access, background processing, and UI responsiveness with a chat interface and system telemetry collection.

## Features

### 🗨️ Desktop Chat UI

- Clean, responsive two-pane interface
- Real-time message sending with immediate UI feedback
- Local-only chat functionality (no server required)
- Message history with timestamps
- System notifications for chat events

### 📊 Background System Telemetry

- Runs asynchronously every 30 seconds
- Collects comprehensive system metrics:
  - **CPU Usage**: Current load, per-core statistics
  - **Memory Usage**: Total, used, free memory with percentages
  - **Network Adapter Metadata**: Active interfaces with driver info
- Graceful handling of missing data
- Platform-appropriate API usage

## Architecture

### Process Separation

Main Process
│ ┌───────────────────────────────────┐
│ │ Telemetry Collector (Node.js)
│ │ • CPU/Memory monitoring
│ │ • Network interface detection
│ │ • Platform-specific APIs
│ └───────────────────────────────────┘
│ ┌───────────────────────────────────┐
| ↑ ↓
│ IPC IPC
│ ↓ ↑
| └───────────────────────────────────┘
│ ┌───────────────────────────────────┐
│ │ Renderer Process (UI)
│ │ • Chat interface
│ │ • Telemetry display
│ │ • User interaction
│ └───────────────────────────────────┘

### Key Components

1. **Main Process** (`main.js`): Manages app lifecycle, IPC, and telemetry collection
2. **Preload Script** (`preload.js`): Secure IPC bridge between processes
3. **Renderer Process** (`renderer.js`): Handles UI and user interactions
4. **Telemetry Collector** (`collector.js`): Background system monitoring
5. **Logger Utility** (`logger.js`): Application logging with file persistence

### Limitatations

| Feature                     | Windows          | macOS            | Linux                 | Notes                                                     |
| --------------------------- | ---------------- | ---------------- | --------------------- | --------------------------------------------------------- |
| **CPU Usage**               | ✅ Full support  | ✅ Full support  | ✅ Full support       | Accurate CPU load data available on all platforms         |
| **Memory Usage**            | ✅ Full support  | ✅ Full support  | ✅ Full support       | RAM statistics consistently available                     |
| **Network Interface Names** | ✅ Full support  | ✅ Full support  | ✅ Full support       | Interface identifiers available everywhere                |
| **Network Interface Types** | ⚠️ Partial       | ⚠️ Partial       | ✅ Full support       | Linux provides the most accurate Wi-Fi/Ethernet detection |
| **MAC Addresses**           | ✅ Full support  | ✅ Full support  | ✅ Full support       | Hardware addresses consistently available                 |
| **IP Addresses**            | ✅ Full support  | ✅ Full support  | ✅ Full support       | IPv4/IPv6 supported across platforms                      |
| **Network Speed**           | ✅ Full support  | ✅ Full support  | ✅ Full support       | Link speed detection works reliably                       |
| **Driver Information**      | ❌ Limited       | ❌ Limited       | ⚠️ Requires `ethtool` | Driver details are rarely exposed in user space           |
| **Driver Version**          | ❌ Not available | ❌ Not available | ⚠️ Requires `ethtool` | Driver versions are not consistently accessible           |
| **Firmware Version**        | ❌ Not available | ❌ Not available | ❌ Not available      | Firmware data is rarely accessible                        |

**Note:**  
Some low-level hardware details (driver and firmware information) are restricted by operating system security models and are not reliably accessible without elevated privileges or platform-specific tools.

## Prerequisites

- Node.js 16+
- npm or yarn
- Electron 28+

## Installation & Running

1. **Clone and install dependencies:**

```bash
git clone <repository-url>
cd desktop-chat-telemetry
npm install
```

# desktop-chat-telemetry

# desktop-chat-telemetry

# desktop-chat-telemetry
