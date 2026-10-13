// ==============================================================================
// MediCloud Audit Logs Routes (Administrator Only)
// Provides audit query endpoints, filtering, security event analytics, and export
// ==============================================================================

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');

const router = express.Router();
router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /api/audit-logs
 * Query audit logs with pagination and multi-field filtering
 */
router.get('/', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  const { eventType, status, actor, search } = req.query;

  let countSql = 'SELECT COUNT(*) as total FROM audit_logs WHERE 1=1';
  let dataSql = `
    SELECT
      id, event_type, actor_id, actor_username, actor_role, target_resource,
      target_id, action, status, ip_address, user_agent, metadata, created_at
    FROM audit_logs
    WHERE 1=1
  `;
  const params = [];
  const countParams = [];

  if (eventType) {
    const clause = ' AND event_type = ?';
    countSql += clause;
    dataSql += clause;
    params.push(eventType);
    countParams.push(eventType);
  }

  if (status && ['SUCCESS', 'FAILURE', 'BLOCKED'].includes(status.toUpperCase())) {
    const clause = ' AND status = ?';
    countSql += clause;
    dataSql += clause;
    params.push(status.toUpperCase());
    countParams.push(status.toUpperCase());
  }

  if (actor) {
    const clause = ' AND actor_username = ?';
    countSql += clause;
    dataSql += clause;
    params.push(actor);
    countParams.push(actor);
  }

  if (search) {
    const clause = ' AND (action LIKE ? OR target_resource LIKE ? OR target_id LIKE ?)';
    countSql += clause;
    dataSql += clause;
    const wild = `%${search}%`;
    params.push(wild, wild, wild);
    countParams.push(wild, wild, wild);
  }

  dataSql += ' ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const totalRow = db.get(countSql, countParams);
  const total = totalRow ? totalRow.total : 0;
  const logs = db.query(dataSql, params);

  // Format JSON metadata
  const formattedLogs = logs.map(l => {
    let meta = null;
    try {
      if (l.metadata) meta = JSON.parse(l.metadata);
    } catch (e) {
      meta = { raw: l.metadata };
    }
    return { ...l, metadata: meta };
  });

  return res.json({
    data: formattedLogs,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  });
});

/**
 * GET /api/audit-logs/stats
 * Aggregate metrics on security and operational events
 */
router.get('/stats', (req, res) => {
  const totalRow = db.get('SELECT COUNT(*) as count FROM audit_logs');
  const blockedRow = db.get("SELECT COUNT(*) as count FROM audit_logs WHERE status = 'BLOCKED'");
  const failedAuthRow = db.get("SELECT COUNT(*) as count FROM audit_logs WHERE event_type = 'AUTH_LOGIN_FAILED'");
  const clinicalAccessRow = db.get("SELECT COUNT(*) as count FROM audit_logs WHERE target_resource = 'MEDICAL_RECORD'");

  const recentEventTypes = db.query(`
    SELECT event_type, COUNT(*) as count
    FROM audit_logs
    GROUP BY event_type
    ORDER BY count DESC
    LIMIT 6
  `);

  return res.json({
    totalAuditRecords: totalRow ? totalRow.count : 0,
    blockedAttempts: blockedRow ? blockedRow.count : 0,
    failedLogins: failedAuthRow ? failedAuthRow.count : 0,
    clinicalRecordAccesses: clinicalAccessRow ? clinicalAccessRow.count : 0,
    topEventTypes: recentEventTypes,
    cloudComplianceNote: 'In an AWS production environment, logs are streamed in real time to AWS CloudWatch Logs & AWS CloudTrail with Amazon S3 Glacier Vault Lock (WORM compliance).'
  });
});

/**
 * GET /api/audit-logs/export
 * Export audit logs for external auditor compliance inspection
 */
router.get('/export', (req, res) => {
  const logs = db.query(`
    SELECT
      id, event_type, actor_id, actor_username, actor_role, target_resource,
      target_id, action, status, ip_address, metadata, created_at
    FROM audit_logs
    ORDER BY created_at DESC
    LIMIT 1000
  `);

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="medicloud_audit_export_${Date.now()}.json"`);
  return res.send(JSON.stringify(logs, null, 2));
});

module.exports = router;
