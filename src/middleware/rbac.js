// ==============================================================================
// MediCloud Role-Based Access Control (RBAC) Middleware
// Strictly enforces deny-by-default server-side authorization
// ==============================================================================

const AuditLogger = require('../utils/auditLogger');

/**
 * Higher-order middleware to require specific system roles
 * @param {...string} allowedRoles - List of authorized roles ('ADMIN', 'DOCTOR', 'RECEPTIONIST')
 */
function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        error: 'Unauthorized. Authentication session required.',
        code: 'UNAUTHENTICATED'
      });
    }

    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      // Log blocked authorization attempt to audit trail
      AuditLogger.logSecurityEvent(req, 'UNAUTHORIZED_ACCESS_ATTEMPT', {
        resource: req.baseUrl + req.path,
        targetId: req.params.id || null,
        action: req.method,
        status: 'BLOCKED',
        meta: {
          userRole,
          allowedRoles,
          method: req.method,
          path: req.originalUrl
        }
      });

      return res.status(403).json({
        error: `Access Denied: Role '${userRole}' is not permitted to access this resource.`,
        code: 'FORBIDDEN_ROLE',
        requiredRoles: allowedRoles,
        currentRole: userRole
      });
    }

    next();
  };
}

// Convenience RBAC guards
const requireAdmin = requireRoles('ADMIN');
const requireDoctor = requireRoles('DOCTOR');
const requireDoctorOrAdmin = requireRoles('DOCTOR', 'ADMIN');
const requireReceptionistOrAdmin = requireRoles('RECEPTIONIST', 'ADMIN');
const requireStaff = requireRoles('ADMIN', 'DOCTOR', 'RECEPTIONIST');

/**
 * Strict medical records clinical notes guard:
 * Doctors can access clinical notes.
 * Admins have audit-level record access.
 * Receptionists are strictly prohibited from viewing or editing clinical notes.
 */
function canAccessClinicalNotes(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role === 'RECEPTIONIST') {
    AuditLogger.logSecurityEvent(req, 'RECEPTIONIST_CLINICAL_ACCESS_BLOCKED', {
      resource: 'MEDICAL_RECORDS',
      targetId: req.params.id || null,
      action: req.method,
      status: 'BLOCKED',
      meta: {
        reason: 'Receptionist role is strictly forbidden from accessing sensitive clinical notes'
      }
    });

    return res.status(403).json({
      error: 'Access Denied: Front-desk Receptionists are strictly prohibited from viewing patient clinical notes.',
      code: 'CLINICAL_PRIVILEGE_RESTRICTION'
    });
  }

  if (req.user.role !== 'DOCTOR' && req.user.role !== 'ADMIN') {
    return res.status(403).json({
      error: 'Access Denied: Clinical records require Doctor or Administrator privileges.',
      code: 'UNAUTHORIZED_CLINICAL_ACCESS'
    });
  }

  next();
}

module.exports = {
  requireRoles,
  requireAdmin,
  requireDoctor,
  requireDoctorOrAdmin,
  requireReceptionistOrAdmin,
  requireStaff,
  canAccessClinicalNotes
};
