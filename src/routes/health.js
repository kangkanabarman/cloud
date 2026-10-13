// ==============================================================================
// MediCloud Health Check & Monitoring Route
// Returns live telemetry, database ping, uptime, and CloudWatch mapping specifications
// ==============================================================================

const express = require('express');
const metrics = require('../utils/metrics');
const config = require('../config');

const router = express.Router();

/**
 * GET /api/health
 * Public health-check endpoint for load balancers (AWS ALB) and monitoring agents
 */
router.get('/', (req, res) => {
  const snapshot = metrics.getSnapshot();
  const httpStatus = snapshot.status === 'HEALTHY' ? 200 : 503;

  return res.status(httpStatus).json({
    app: config.appName,
    environment: config.env,
    ...snapshot,
    awsMonitoringBlueprint: {
      proposedAlbHealthCheckPath: '/api/health',
      proposedAlbHealthyThreshold: 2,
      proposedAlbIntervalSeconds: 30,
      proposedAlbTimeoutSeconds: 5,
      cloudWatchMetrics: [
        'AWS/ApplicationELB/TargetResponseTime',
        'AWS/ApplicationELB/HTTPCode_Target_5XX_Count',
        'AWS/RDS/CPUUtilization',
        'AWS/RDS/DatabaseConnections',
        'AWS/RDS/FreeStorageSpace',
        'AWS/RDS/ReadLatency',
        'AWS/RDS/WriteLatency'
      ]
    }
  });
});

module.exports = router;
