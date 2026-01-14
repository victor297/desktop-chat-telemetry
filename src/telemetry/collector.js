const si = require("systeminformation");
const os = require("os");
const logger = require("../utils/logger");

class TelemetryCollector {
  constructor(callback) {
    this.callback = callback;
    this.interval = null;
    this.isCollecting = false;
    this.collectionInterval = 30000; // 30 seconds
  }

  async collectTelemetry() {
    try {
      const timestamp = new Date().toISOString();

      // Collect system metrics
      const [cpuLoad, memInfo, networkInterfaces] = await Promise.all([
        this.getCpuUsage(),
        this.getMemoryUsage(),
        this.getNetworkInfo(),
      ]);

      const telemetryData = {
        timestamp,
        system: {
          platform: process.platform,
          arch: process.arch,
          hostname: os.hostname(),
          uptime: os.uptime(),
          loadavg: os.loadavg(),
        },
        cpu: cpuLoad,
        memory: memInfo,
        network: networkInterfaces,
        status: "success",
      };

      logger.log("Telemetry collected at:", timestamp);
      return telemetryData;
    } catch (error) {
      logger.error("Error collecting telemetry:", error);
      return {
        timestamp: new Date().toISOString(),
        error: error.message,
        status: "error",
      };
    }
  }

  async getCpuUsage() {
    try {
      const cpuData = await si.currentLoad();
      return {
        usage: Math.round(cpuData.currentLoad),
        cores: cpuData.cpus.length,
        user: cpuData.currentLoadUser,
        system: cpuData.currentLoadSystem,
        idle: cpuData.currentLoadIdle,
      };
    } catch (error) {
      logger.warn("Could not get CPU usage:", error.message);
      return {
        usage: 0,
        cores: os.cpus().length,
        error: error.message,
      };
    }
  }

  async getMemoryUsage() {
    try {
      const memData = await si.mem();
      const total = memData.total;
      const used = memData.used;
      const free = memData.free;

      return {
        total: this.formatBytes(total),
        used: this.formatBytes(used),
        free: this.formatBytes(free),
        usage: Math.round((used / total) * 100),
        raw: {
          total,
          used,
          free,
        },
      };
    } catch (error) {
      logger.warn("Could not get memory usage:", error.message);
      const total = os.totalmem();
      const free = os.freemem();
      const used = total - free;

      return {
        total: this.formatBytes(total),
        used: this.formatBytes(used),
        free: this.formatBytes(free),
        usage: Math.round((used / total) * 100),
        error: "Using fallback OS API",
      };
    }
  }

  async getNetworkInfo() {
    try {
      const networkData = await si.networkInterfaces();

      // Find active interfaces (excluding loopback)
      const activeInterfaces = networkData.filter(
        (iface) => !iface.internal && iface.operstate === "up"
      );

      const interfaces = await Promise.all(
        activeInterfaces.map(async (iface) => {
          try {
            // Get additional network stats
            const stats = await si.networkStats(iface.iface);

            return {
              name: iface.iface,
              type: this.determineInterfaceType(iface),
              mac: iface.mac,
              ip4: iface.ip4,
              ip6: iface.ip6,
              speed: iface.speed,
              duplex: iface.duplex,
              mtu: iface.mtu,
              // Try to get driver info (platform-specific)
              driver: await this.getDriverInfo(iface),
              // Add network stats if available
              stats: stats && stats.length > 0 ? stats[0] : null,
              lastUpdated: new Date().toISOString(),
            };
          } catch (error) {
            return {
              name: iface.iface,
              type: this.determineInterfaceType(iface),
              mac: iface.mac,
              ip4: iface.ip4,
              error: error.message,
            };
          }
        })
      );

      return {
        interfaces,
        defaultGateway: await this.getDefaultGateway(),
        dnsServers: await this.getDnsServers(),
        platform: process.platform,
      };
    } catch (error) {
      logger.warn("Could not get network info:", error.message);

      // Fallback to OS network interfaces
      const osInterfaces = os.networkInterfaces();
      const interfaces = [];

      Object.keys(osInterfaces).forEach((ifaceName) => {
        osInterfaces[ifaceName].forEach((iface) => {
          if (!iface.internal && iface.family === "IPv4") {
            interfaces.push({
              name: ifaceName,
              type: "unknown",
              address: iface.address,
              netmask: iface.netmask,
              family: iface.family,
              error: "Limited info available",
            });
          }
        });
      });

      return {
        interfaces,
        error: "Using fallback network info",
      };
    }
  }

  async getDriverInfo(iface) {
    // Platform-specific driver info extraction
    try {
      switch (process.platform) {
        case "win32":
          // On Windows, we might get driver info from systeminformation
          return {
            description: iface.desc || "Unknown",
            manufacturer: iface.manufacturer || "Unknown",
            version: "N/A", // Windows doesn't expose driver version easily
          };

        case "darwin": // macOS
          return {
            description: iface.desc || "Unknown",
            version: "N/A", // macOS doesn't expose driver version
          };

        case "linux":
          // On Linux, we might be able to get more info
          const { exec } = require("child_process");
          const { promisify } = require("util");
          const execAsync = promisify(exec);

          try {
            // Try to get driver info from ethtool (if available)
            const { stdout } = await execAsync(
              `ethtool -i ${iface.iface} 2>/dev/null || echo ""`
            );

            if (stdout) {
              const lines = stdout.split("\n");
              const driverInfo = {};

              lines.forEach((line) => {
                const [key, value] = line.split(":").map((s) => s.trim());
                if (key && value) {
                  driverInfo[key.toLowerCase()] = value;
                }
              });

              return driverInfo;
            }
          } catch (e) {
            // ethtool not available or failed
          }

          return {
            description: iface.desc || "Unknown",
            note: "Install ethtool for detailed driver info",
          };

        default:
          return {
            description: iface.desc || "Unknown",
            note: "Platform not fully supported for driver info",
          };
      }
    } catch (error) {
      return {
        error: `Could not get driver info: ${error.message}`,
      };
    }
  }

  async getDefaultGateway() {
    try {
      const { default: defaultGateway } = await si.networkGatewayDefault();
      return defaultGateway || "Unknown";
    } catch (error) {
      return "Unknown";
    }
  }

  async getDnsServers() {
    try {
      const dnsData = await si.networkDns();
      return dnsData || [];
    } catch (error) {
      return [];
    }
  }

  determineInterfaceType(iface) {
    const name = iface.iface.toLowerCase();
    const desc = (iface.desc || "").toLowerCase();

    if (
      name.includes("wifi") ||
      name.includes("wlan") ||
      desc.includes("wireless") ||
      desc.includes("wi-fi") ||
      desc.includes("802.11")
    ) {
      return "Wi-Fi";
    } else if (
      name.includes("eth") ||
      name.includes("en") ||
      desc.includes("ethernet") ||
      desc.includes("lan")
    ) {
      return "Ethernet";
    } else if (name.includes("lo") || desc.includes("loopback")) {
      return "Loopback";
    } else if (name.includes("ppp") || desc.includes("point-to-point")) {
      return "PPP";
    } else {
      return "Unknown";
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  start() {
    if (this.isCollecting) {
      logger.log("Telemetry collection already running");
      return;
    }

    logger.log("Starting telemetry collection...");
    this.isCollecting = true;

    // Collect immediately
    this.collectAndSend();

    // Then set up interval
    this.interval = setInterval(() => {
      this.collectAndSend();
    }, this.collectionInterval);
  }

  async collectAndSend() {
    const data = await this.collectTelemetry();
    if (this.callback) {
      this.callback(data);
    }
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isCollecting = false;
    logger.log("Telemetry collection stopped");
  }

  setInterval(ms) {
    this.collectionInterval = ms;
    if (this.isCollecting) {
      this.stop();
      this.start();
    }
  }
}

module.exports = TelemetryCollector;
