// ==============================================================================
// MediCloud Audit Logging Utility
// Implements strict non-sensitive security and operational event logging
// NEVER logs passwords, tokens, or full clinical patient notes
// ==============================================================================

const db = require('../db');

class AuditLogger {
  /**
   * Core audit log insertion with defensive sanitization
   */
  static log({
    eventType,
    actorId = null,
    actorUsername = 'anonymous',
    actorRole = 'NONE',
    targetResource = 'SYSTEM',
    targetId = null,
    action,
    status = 'SUCCESS',
    ipAddress = 'unknown',
    userAgent = 'unknown',
    metadata = {}
  }) {
    try {
      // Defensive sanitization: remove any sensitive fields
      const sanitizedMeta = { ...metadata };
      delete sanitizedMeta.password;
      delete sanitizedMeta.password_hash;
      delete sanitizedMeta.session;
      delete sanitizedMeta.token;
      delete sanitizedMeta.authorization;
      delete sanitizedMeta.clinical_notes;
      delete sanitizedMeta.diagnosis;

      const metaString = JSON.stringify(sanitizedMeta);

      const sql = `
        INSERT INTO audit_logs (
          event_type, actor_id, actor_username, actor_role, target_resource,
          target_id, action, status, ip_address, user_agent, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.run(sql, [
        eventType,
        actorId,
        actorUsername,
        actorRole,
        targetResource,
        targetId ? String(targetId) : null,
        action,
        status,
        String(ipAddress).slice(0, 60),
        String(userAgent).slice(0, 255),
        metaString
      ]);
    } catch (err) {
      // Never let an audit logging failure crash application execution
      console.error('⚠️ [AuditLogger Failure]:', err.message);
    }
  }

  static getClientInfo(req) {
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    const ua = req.headers['user-agent'] || 'Unknown Agent';
    return { ip, ua };
  }

  static logAuthSuccess(req, user) {
    const { ip, ua } = this.getClientInfo(req);
    this.log({
      eventType: 'AUTH_LOGIN_SUCCESS',
      actorId: user.id,
      actorUsername: user.username,
      actorRole: user.role,
      targetResource: 'AUTH_SESSION',
      targetId: String(user.id),
      action: 'USER_LOGIN',
      status: 'SUCCESS',
      ipAddress: ip,
      userAgent: ua,
      metadata: { email: user.email, role: user.role }
    });
  }

  static logAuthFailure(req, email, reason) {
    const { ip, ua } = this.getClientInfo(req);
    this.log({
      eventType: 'AUTH_LOGIN_FAILED',
      actorId: null,
      actorUsername: email || 'unknown',
      actorRole: 'ANONYMOUS',
      targetResource: 'AUTH_SESSION',
      targetId: null,
      action: 'USER_LOGIN_ATTEMPT',
      status: 'FAILURE',
      ipAddress: ip,
      userAgent: ua,
      metadata: { reason }
    });
  }

  static logAuthLogout(req, user) {
    const { ip, ua } = this.getClientInfo(req);
    this.log({
      eventType: 'AUTH_LOGOUT',
      actorId: user?.id || null,
      actorUsername: user?.username || 'unknown',
      actorRole: user?.role || 'NONE',
      targetResource: 'AUTH_SESSION',
      targetId: user?.id ? String(user.id) : null,
      action: 'USER_LOGOUT',
      status: 'SUCCESS',
      ipAddress: ip,
      userAgent: ua,
      metadata: { message: 'Session invalidated gracefully' }
    });
  }

  static logSecurityEvent(req, eventType, details) {
    const { ip, ua } = this.getClientInfo(req);
    const user = req.session?.user;
    this.log({
      eventType: eventType || 'SECURITY_EVENT',
      actorId: user?.id || null,
      actorUsername: user?.username || 'anonymous',
      actorRole: user?.role || 'ANONYMOUS',
      targetResource: details.resource || 'SECURITY_GATEWAY',
      targetId: details.targetId || null,
      action: details.action || 'SECURITY_INTERCEPTION',
      status: details.status || 'BLOCKED',
      ipAddress: ip,
      userAgent: ua,
      metadata: details.meta || {}
    });
  }

  static logAction(req, resource, targetId, action, status = 'SUCCESS', meta = {}) {
    const { ip, ua } = this.getClientInfo(req);
    const user = req.session?.user;
    this.log({
      eventType: `${resource}_${action}`.toUpperCase(),
      actorId: user?.id || null,
      actorUsername: user?.username || 'system',
      actorRole: user?.role || 'SYSTEM',
      targetResource: resource,
      targetId: targetId ? String(targetId) : null,
      action,
      status,
      ipAddress: ip,
      userAgent: ua,
      metadata: meta
    });
  }
}

module.exports = AuditLogger;
