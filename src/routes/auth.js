// ==============================================================================
// MediCloud Authentication Routes
// Handles login, logout, session state, and fictional demo accounts
// ==============================================================================

const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const AuditLogger = require('../utils/auditLogger');
const metrics = require('../utils/metrics');

const router = express.Router();

/**
 * POST /api/auth/login
 * User login with credential validation, session binding, and rate limiting
 */
router.post('/login', authLimiter, (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    AuditLogger.logAuthFailure(req, email, 'Missing email or password');
    metrics.recordFailedLogin();
    return res.status(400).json({
      error: 'Please provide both email and password.',
      code: 'INVALID_CREDENTIALS'
    });
  }

  const user = db.get('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [email.trim()]);

  if (!user) {
    AuditLogger.logAuthFailure(req, email, 'User not found');
    metrics.recordFailedLogin();
    return res.status(401).json({
      error: 'Invalid email address or password.',
      code: 'AUTH_FAILED'
    });
  }

  if (user.status !== 'ACTIVE') {
    AuditLogger.logAuthFailure(req, email, 'Account is disabled');
    metrics.recordFailedLogin();
    return res.status(403).json({
      error: 'Your account has been deactivated. Please contact an administrator.',
      code: 'ACCOUNT_DISABLED'
    });
  }

  const isPasswordValid = bcrypt.compareSync(password, user.password_hash);
  if (!isPasswordValid) {
    AuditLogger.logAuthFailure(req, email, 'Incorrect password');
    metrics.recordFailedLogin();
    return res.status(401).json({
      error: 'Invalid email address or password.',
      code: 'AUTH_FAILED'
    });
  }

  // Update last login timestamp
  db.run('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

  // Set secure session
  req.session.user = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    full_name: user.full_name
  };

  // If doctor, look up doctor_id and doctor_code
  let doctorDetails = null;
  if (user.role === 'DOCTOR') {
    doctorDetails = db.get('SELECT id, doctor_code, department FROM doctors WHERE user_id = ?', [user.id]);
    if (doctorDetails) {
      req.session.user.doctorId = doctorDetails.id;
      req.session.user.doctorCode = doctorDetails.doctor_code;
      req.session.user.department = doctorDetails.department;
    }
  }

  AuditLogger.logAuthSuccess(req, user);

  return res.json({
    message: 'Authentication successful',
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
      doctor: doctorDetails
    }
  });
});

/**
 * POST /api/auth/logout
 * Destroys current session and removes session cookie
 */
router.post('/logout', (req, res) => {
  const currentUser = req.session?.user;
  if (currentUser) {
    AuditLogger.logAuthLogout(req, currentUser);
  }

  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: 'Could not log out. Please try again.' });
    }
    res.clearCookie('medicloud.sid');
    return res.json({ message: 'Successfully signed out.' });
  });
});

/**
 * GET /api/auth/me
 * Retrieves authenticated user details from active session
 */
router.get('/me', requireAuth, (req, res) => {
  let doctorDetails = null;
  if (req.user.role === 'DOCTOR') {
    doctorDetails = db.get('SELECT id, doctor_code, department, specialization, availability_status FROM doctors WHERE user_id = ?', [
      req.user.id
    ]);
  }

  return res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role,
      fullName: req.user.full_name,
      status: req.user.status,
      doctor: doctorDetails
    }
  });
});

/**
 * GET /api/auth/demo-users
 * Returns list of fictional accounts for rapid academic demonstration and role switching
 */
router.get('/demo-users', (req, res) => {
  const users = db.query(`
    SELECT u.id, u.email, u.role, u.full_name, d.department, d.doctor_code
    FROM users u
    LEFT JOIN doctors d ON u.id = d.user_id
    WHERE u.status = 'ACTIVE'
    ORDER BY CASE u.role
      WHEN 'ADMIN' THEN 1
      WHEN 'DOCTOR' THEN 2
      WHEN 'RECEPTIONIST' THEN 3
      ELSE 4 END
  `);

  const demoAccounts = users.map(u => ({
    email: u.email,
    role: u.role,
    name: u.full_name,
    department: u.department || null,
    samplePassword: u.role === 'ADMIN'
      ? 'AdminPassword123!'
      : u.role === 'DOCTOR'
        ? 'DoctorPassword123!'
        : 'ReceptionPassword123!'
  }));

  res.json({ demoAccounts });
});

module.exports = router;
