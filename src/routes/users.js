// ==============================================================================
// MediCloud User & Role Management Routes (Administrator Only)
// ==============================================================================

const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');
const AuditLogger = require('../utils/auditLogger');

const router = express.Router();
router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /api/users
 * List all users with roles and status (excludes password_hash)
 */
router.get('/', (req, res) => {
  const users = db.query(`
    SELECT
      u.id, u.username, u.email, u.role, u.full_name, u.status,
      u.last_login_at, u.created_at,
      d.id as doctor_id, d.doctor_code, d.department, d.specialization
    FROM users u
    LEFT JOIN doctors d ON u.id = d.user_id
    ORDER BY u.created_at DESC
  `);

  return res.json({ users });
});

/**
 * POST /api/users
 * Create a new user with designated role (ADMIN, DOCTOR, RECEPTIONIST)
 */
router.post('/', (req, res) => {
  const {
    username,
    email,
    password,
    role,
    fullName,
    department,
    specialization
  } = req.body;

  if (!username || !email || !password || !role || !fullName) {
    return res.status(400).json({
      error: 'Please provide username, email, password, role, and fullName.'
    });
  }

  const validRoles = ['ADMIN', 'DOCTOR', 'RECEPTIONIST'];
  if (!validRoles.includes(role.toUpperCase())) {
    return res.status(400).json({
      error: 'Invalid role. Must be ADMIN, DOCTOR, or RECEPTIONIST.'
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      error: 'Password must be at least 8 characters long.'
    });
  }

  // Check unique constraints
  const existingUser = db.get('SELECT id FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?)', [
    email.trim(),
    username.trim()
  ]);
  if (existingUser) {
    return res.status(409).json({
      error: 'A user with that email or username already exists.'
    });
  }

  const passwordHash = bcrypt.hashSync(password, 12);
  const targetRole = role.toUpperCase();

  let createdUserId = null;

  db.transaction(() => {
    const insertSql = `
      INSERT INTO users (username, email, password_hash, role, full_name, status)
      VALUES (?, ?, ?, ?, ?, 'ACTIVE')
    `;
    const result = db.run(insertSql, [
      username.trim(),
      email.trim(),
      passwordHash,
      targetRole,
      fullName.trim()
    ]);
    createdUserId = result.lastInsertRowid;

    // If creating a doctor, optionally link a doctor profile
    if (targetRole === 'DOCTOR') {
      const docCount = db.get('SELECT COUNT(*) as count FROM doctors');
      const docCode = `DOC-${100 + (docCount ? docCount.count : 0) + 1}`;
      db.run(`
        INSERT INTO doctors (
          user_id, doctor_code, full_name, department, specialization, email, phone, availability_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'AVAILABLE')
      `, [
        createdUserId,
        docCode,
        fullName.trim(),
        department ? department.trim() : 'General Medicine',
        specialization ? specialization.trim() : 'Clinical Practice',
        email.trim(),
        '+1-555-0300'
      ]);
    }
  });

  AuditLogger.logAction(req, 'USER', String(createdUserId), 'CREATE_USER', 'SUCCESS', {
    createdUserId,
    username: username.trim(),
    role: targetRole,
    createdBy: req.user.username
  });

  return res.status(201).json({
    message: 'User created successfully',
    user: {
      id: createdUserId,
      username: username.trim(),
      email: email.trim(),
      role: targetRole,
      fullName: fullName.trim()
    }
  });
});

/**
 * PUT /api/users/:id/status
 * Toggle user active/disabled status
 */
router.put('/:id/status', (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const { status } = req.body;

  if (!['ACTIVE', 'DISABLED'].includes(status)) {
    return res.status(400).json({ error: 'Status must be ACTIVE or DISABLED' });
  }

  // Prevent disabling self
  if (userId === req.user.id) {
    return res.status(400).json({ error: 'You cannot disable your own administrator account.' });
  }

  const user = db.get('SELECT * FROM users WHERE id = ?', [userId]);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  db.run('UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
    status,
    userId
  ]);

  AuditLogger.logAction(req, 'USER', String(userId), 'UPDATE_USER_STATUS', 'SUCCESS', {
    targetUserId: userId,
    targetUsername: user.username,
    newStatus: status
  });

  return res.json({
    message: `User status changed to ${status}`,
    userId,
    status
  });
});

/**
 * PUT /api/users/:id/role
 * Change user role
 */
router.put('/:id/role', (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const { role } = req.body;

  if (!['ADMIN', 'DOCTOR', 'RECEPTIONIST'].includes(role)) {
    return res.status(400).json({ error: 'Role must be ADMIN, DOCTOR, or RECEPTIONIST' });
  }

  if (userId === req.user.id) {
    return res.status(400).json({ error: 'You cannot change your own role.' });
  }

  const user = db.get('SELECT * FROM users WHERE id = ?', [userId]);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  db.run('UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
    role,
    userId
  ]);

  AuditLogger.logAction(req, 'USER', String(userId), 'UPDATE_USER_ROLE', 'SUCCESS', {
    targetUserId: userId,
    targetUsername: user.username,
    previousRole: user.role,
    newRole: role
  });

  return res.json({
    message: `User role updated to ${role}`,
    userId,
    role
  });
});

module.exports = router;
