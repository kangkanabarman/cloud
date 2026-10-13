// ==============================================================================
// MediCloud Doctor Management Routes
// Handles doctor directory, availability toggles, and administrative profile controls
// ==============================================================================

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { requireAdmin, requireStaff } = require('../middleware/rbac');
const AuditLogger = require('../utils/auditLogger');

const router = express.Router();
router.use(requireAuth);

/**
 * GET /api/doctors
 * List all doctors with department, availability, and consultation room
 */
router.get('/', requireStaff, (req, res) => {
  const { department, availability } = req.query;
  let sql = `
    SELECT
      d.id, d.doctor_code, d.full_name, d.department, d.specialization,
      d.email, d.phone, d.availability_status, d.room_number, d.user_id
    FROM doctors d
    WHERE 1=1
  `;
  const params = [];

  if (department) {
    sql += ' AND d.department = ?';
    params.push(department);
  }
  if (availability) {
    sql += ' AND d.availability_status = ?';
    params.push(availability.toUpperCase());
  }

  sql += ' ORDER BY d.department ASC, d.full_name ASC';
  const doctors = db.query(sql, params);

  return res.json({ doctors });
});

/**
 * GET /api/doctors/departments
 * List distinct departments
 */
router.get('/departments', requireStaff, (req, res) => {
  const depts = db.query('SELECT DISTINCT department FROM doctors ORDER BY department ASC');
  return res.json({ departments: depts.map(d => d.department) });
});

/**
 * GET /api/doctors/:id
 * Retrieve doctor profile and their assigned upcoming appointments
 */
router.get('/:id', requireStaff, (req, res) => {
  const doctorId = parseInt(req.params.id, 10);
  if (isNaN(doctorId)) {
    return res.status(400).json({ error: 'Invalid doctor ID format' });
  }

  const doctor = db.get('SELECT * FROM doctors WHERE id = ?', [doctorId]);
  if (!doctor) {
    return res.status(404).json({ error: 'Doctor not found' });
  }

  // Active appointments assigned to this doctor
  const appointments = db.query(`
    SELECT
      a.id, a.appointment_code, a.appointment_date, a.appointment_time,
      a.type, a.status, p.patient_code, p.full_name as patient_name
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    WHERE a.doctor_id = ? AND a.status IN ('SCHEDULED', 'IN_PROGRESS')
    ORDER BY a.appointment_date ASC, a.appointment_time ASC
    LIMIT 10
  `, [doctorId]);

  return res.json({
    doctor,
    appointments
  });
});

/**
 * POST /api/doctors
 * Register a new doctor profile (Admin only)
 */
router.post('/', requireAdmin, (req, res) => {
  const {
    fullName,
    department,
    specialization,
    email,
    phone,
    roomNumber,
    userId
  } = req.body;

  if (!fullName || !department || !specialization || !email || !phone) {
    return res.status(400).json({ error: 'Please provide fullName, department, specialization, email, and phone.' });
  }

  // Generate unique doctor code
  const countRow = db.get('SELECT COUNT(*) as total FROM doctors');
  const doctorCode = `DOC-${100 + (countRow ? countRow.total : 0) + 1}`;

  const insertSql = `
    INSERT INTO doctors (
      user_id, doctor_code, full_name, department, specialization, email, phone, availability_status, room_number
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'AVAILABLE', ?)
  `;

  const result = db.run(insertSql, [
    userId || null,
    doctorCode,
    fullName.trim(),
    department.trim(),
    specialization.trim(),
    email.trim(),
    phone.trim(),
    roomNumber ? roomNumber.trim() : null
  ]);

  AuditLogger.logAction(req, 'DOCTOR', doctorCode, 'CREATE_DOCTOR', 'SUCCESS', {
    doctorId: result.lastInsertRowid,
    doctorCode
  });

  return res.status(201).json({
    message: 'Doctor profile created successfully',
    doctor: {
      id: result.lastInsertRowid,
      doctorCode,
      fullName: fullName.trim(),
      department: department.trim()
    }
  });
});

/**
 * PUT /api/doctors/:id/availability
 * Update doctor availability status (Admin or self)
 */
router.put('/:id/availability', (req, res) => {
  const doctorId = parseInt(req.params.id, 10);
  const { status } = req.body;

  if (!['AVAILABLE', 'IN_CONSULTATION', 'ON_LEAVE'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be AVAILABLE, IN_CONSULTATION, or ON_LEAVE' });
  }

  const doctor = db.get('SELECT * FROM doctors WHERE id = ?', [doctorId]);
  if (!doctor) {
    return res.status(404).json({ error: 'Doctor not found' });
  }

  // Authorization: Must be ADMIN or the doctor themself
  const isAdmin = req.user.role === 'ADMIN';
  const isSelf = req.user.role === 'DOCTOR' && doctor.user_id === req.user.id;

  if (!isAdmin && !isSelf) {
    return res.status(403).json({
      error: 'You do not have permission to change this doctor’s availability status.'
    });
  }

  db.run('UPDATE doctors SET availability_status = ? WHERE id = ?', [status, doctorId]);

  AuditLogger.logAction(req, 'DOCTOR', doctor.doctor_code, 'UPDATE_AVAILABILITY', 'SUCCESS', {
    doctorId,
    newStatus: status
  });

  return res.json({
    message: `Doctor status updated to ${status}`,
    doctorId,
    status
  });
});

module.exports = router;
