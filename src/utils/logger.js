const fs = require("fs");
const path = require("path");
const { app } = require("electron");

class Logger {
  constructor() {
    this.logsDir = path.join(app.getPath("userData"), "logs");

    // Create logs directory if it doesn't exist
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }

    this.logFile = path.join(
      this.logsDir,
      `app-${new Date().toISOString().split("T")[0]}.log`
    );
  }

  formatMessage(level, message, ...args) {
    const timestamp = new Date().toISOString();
    const formattedArgs = args
      .map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : arg))
      .join(" ");

    return `[${timestamp}] [${level}] ${message} ${formattedArgs}\n`;
  }

  log(message, ...args) {
    const formatted = this.formatMessage("INFO", message, ...args);
    process.stdout.write(formatted);
    this.writeToFile(formatted);
  }

  error(message, ...args) {
    const formatted = this.formatMessage("ERROR", message, ...args);
    process.stderr.write(formatted);
    this.writeToFile(formatted);
  }

  warn(message, ...args) {
    const formatted = this.formatMessage("WARN", message, ...args);
    process.stdout.write(formatted);
    this.writeToFile(formatted);
  }

  writeToFile(message) {
    try {
      fs.appendFileSync(this.logFile, message);
    } catch (error) {
      console.error("Failed to write to log file:", error);
    }
  }
}

module.exports = new Logger();
