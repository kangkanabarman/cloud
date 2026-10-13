// ==============================================================================
// MediCloud System Metrics & Telemetry Utility
// Collects real-time runtime metrics, response times, memory, and security counters
// ==============================================================================

const db = require('../db');

class MetricsCollector {
  constructor() {
    this.startTime = Date.now();
    this.totalRequests = 0;
    this.totalResponseTimeMs = 0;
    this.minResponseTimeMs = Infinity;
    this.maxResponseTimeMs = 0;
    this.statusCodes = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 };
    this.latencyHistory = []; // stores last 50 response times
    this.securityEvents = {
      failedLogins: 0,
      blockedRequests: 0,
      rateLimited: 0
    };
  }

  recordRequest(durationMs, statusCode) {
    this.totalRequests += 1;
    this.totalResponseTimeMs += durationMs;

    if (durationMs < this.minResponseTimeMs) this.minResponseTimeMs = durationMs;
    if (durationMs > this.maxResponseTimeMs) this.maxResponseTimeMs = durationMs;

    const group = `${Math.floor(statusCode / 100)}xx`;
    if (this.statusCodes[group] !== undefined) {
      this.statusCodes[group] += 1;
    }

    if (statusCode === 401 || statusCode === 403) {
      this.securityEvents.blockedRequests += 1;
    }

    this.latencyHistory.push({
      t: Date.now(),
      d: parseFloat(durationMs.toFixed(2)),
      s: statusCode
    });

    if (this.latencyHistory.length > 50) {
      this.latencyHistory.shift();
    }
  }

  recordFailedLogin() {
    this.securityEvents.failedLogins += 1;
  }

  recordRateLimit() {
    this.securityEvents.rateLimited += 1;
  }

  getSnapshot() {
    const memory = process.memoryUsage();
    const uptimeSec = Math.floor((Date.now() - this.startTime) / 1000);

    let avgResponseTime = 0;
    if (this.totalRequests > 0) {
      avgResponseTime = parseFloat((this.totalResponseTimeMs / this.totalRequests).toFixed(2));
    }

    // Check DB responsiveness
    let dbStatus = 'CONNECTED';
    let dbLatencyMs = 0;
    try {
      const dbStart = performance.now();
      db.get('SELECT 1 as test');
      dbLatencyMs = parseFloat((performance.now() - dbStart).toFixed(2));
    } catch (e) {
      dbStatus = 'DISCONNECTED';
    }

    return {
      status: dbStatus === 'CONNECTED' ? 'HEALTHY' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      uptimeSeconds: uptimeSec,
      uptimeFormatted: this.formatUptime(uptimeSec),
      process: {
        nodeVersion: process.version,
        platform: process.platform,
        pid: process.pid,
        arch: process.arch
      },
      memory: {
        rssMb: (memory.rss / (1024 * 1024)).toFixed(2),
        heapTotalMb: (memory.heapTotal / (1024 * 1024)).toFixed(2),
        heapUsedMb: (memory.heapUsed / (1024 * 1024)).toFixed(2),
        externalMb: (memory.external / (1024 * 1024)).toFixed(2)
      },
      performance: {
        totalRequests: this.totalRequests,
        avgResponseTimeMs: avgResponseTime,
        minResponseTimeMs: this.minResponseTimeMs === Infinity ? 0 : parseFloat(this.minResponseTimeMs.toFixed(2)),
        maxResponseTimeMs: parseFloat(this.maxResponseTimeMs.toFixed(2)),
        statusCodes: this.statusCodes,
        recentLatency: this.latencyHistory.slice(-15)
      },
      database: {
        status: dbStatus,
        queryLatencyMs: dbLatencyMs,
        engine: 'SQLite 3 (Target: Amazon RDS MySQL 8.0)'
      },
      security: {
        ...this.securityEvents
      }
    };
  }

  formatUptime(seconds) {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${d > 0 ? `${d}d ` : ''}${h}h ${m}m ${s}s`;
  }
}

const metrics = new MetricsCollector();
module.exports = metrics;
