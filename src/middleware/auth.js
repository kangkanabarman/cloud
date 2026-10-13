// ==============================================================================
// MediCloud Authentication Middleware
// Enforces server-side session authentication with HttpOnly cookies
// ==============================================================================

const db = require('../db');

function requireAuth(req, res, next) {
  if (!req.session || !req.session.user || !req.session.user.id) {
    return res.status(401).json({
      error: 'Authentication required. Please sign in to access this resource.',
      code: 'AUTH_REQUIRED'
    });
  }

  // Verify that user still exists and is ACTIVE in database
  const user = db.get('SELECT id, username, email, role, full_name, status FROM users WHERE id = ?', [
    req.session.user.id
  ]);

  if (!user) {
    req.session.destroy();
    return res.status(401).json({
      error: 'User account no longer exists. Session terminated.',
      code: 'USER_NOT_FOUND'
    });
  }

  if (user.status !== 'ACTIVE') {
    req.session.destroy();
    return res.status(403).json({
      error: 'Account has been disabled. Please contact system administrator.',
      code: 'ACCOUNT_DISABLED'
    });
  }

  req.user = user;
  next();
}

function optionalAuth(req, res, next) {
  if (req.session && req.session.user && req.session.user.id) {
    const user = db.get('SELECT id, username, email, role, full_name, status FROM users WHERE id = ?', [
      req.session.user.id
    ]);
    if (user && user.status === 'ACTIVE') {
      req.user = user;
    }
  }
  next();
}

module.exports = {
  requireAuth,
  optionalAuth
};
