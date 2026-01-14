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
│ ↑ ↓
│ IPC IPC
│ ↓ ↑
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
