// ==============================================================================
// MediCloud Appointment Management Routes
// Handles appointment scheduling, doctor/patient validation, and status tracking
// ==============================================================================

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { requireReceptionistOrAdmin, requireStaff } = require('../middleware/rbac');
const AuditLogger = require('../utils/auditLogger');

const router = express.Router();
router.use(requireAuth);

/**
 * GET /api/appointments
 * List appointments with role-scoped filtering and status queries
 */
router.get('/', requireStaff, (req, res) => {
  const { date, status, doctorId, patientId } = req.query;

  let sql = `
    SELECT
      a.id, a.appointment_code, a.appointment_date, a.appointment_time,
      a.department, a.type, a.status, a.notes, a.created_at,
      p.id as patient_id, p.patient_code, p.full_name as patient_name, p.phone as patient_phone,
      d.id as doctor_id, d.doctor_code, d.full_name as doctor_name, d.room_number
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    JOIN doctors d ON a.doctor_id = d.id
    WHERE 1=1
  `;
  const params = [];

  // Scoping: If user is DOCTOR and has an associated doctor profile, default/limit to their appointments
  if (req.user.role === 'DOCTOR') {
    const doc = db.get('SELECT id FROM doctors WHERE user_id = ?', [req.user.id]);
    if (doc) {
      sql += ' AND a.doctor_id = ?';
      params.push(doc.id);
    }
  } else if (doctorId) {
    sql += ' AND a.doctor_id = ?';
    params.push(parseInt(doctorId, 10));
  }

  if (patientId) {
    sql += ' AND a.patient_id = ?';
    params.push(parseInt(patientId, 10));
  }

  if (date) {
    sql += ' AND a.appointment_date = ?';
    params.push(date);
  }

  if (status && ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(status.toUpperCase())) {
    sql += ' AND a.status = ?';
    params.push(status.toUpperCase());
  }

  sql += ' ORDER BY a.appointment_date DESC, a.appointment_time ASC LIMIT 100';
  const appointments = db.query(sql, params);

  return res.json({ appointments });
});

/**
 * POST /api/appointments
 * Schedule a new appointment (Admin & Receptionist only)
 */
router.post('/', requireReceptionistOrAdmin, (req, res) => {
  const {
    patientId,
    doctorId,
    department,
    appointmentDate,
    appointmentTime,
    type = 'ROUTINE_CHECKUP',
    notes = ''
  } = req.body;

  // Validation: Missing fields
  if (!patientId || !doctorId || !department || !appointmentDate || !appointmentTime) {
    return res.status(400).json({
      error: 'Please provide patientId, doctorId, department, appointmentDate, and appointmentTime.'
    });
  }

  // Validation: Date format and past-date prevention
  if (!/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate)) {
    return res.status(400).json({ error: 'Invalid appointment date format (YYYY-MM-DD).' });
  }

  const todayStr = new Date().toISOString().split('T')[0];
  if (appointmentDate < todayStr) {
    return res.status(400).json({
      error: 'Cannot schedule appointment for a past date. Please select today or a future date.'
    });
  }

  // Validate patient existence on server
  const patient = db.get('SELECT id, patient_code, full_name, status FROM patients WHERE id = ?', [patientId]);
  if (!patient) {
    return res.status(400).json({ error: 'Invalid patient selected. Patient record does not exist.' });
  }
  if (patient.status === 'DISCHARGED') {
    return res.status(400).json({ error: 'Cannot book appointment for a discharged patient.' });
  }

  // Validate doctor existence on server
  const doctor = db.get('SELECT id, doctor_code, full_name, availability_status FROM doctors WHERE id = ?', [doctorId]);
  if (!doctor) {
    return res.status(400).json({ error: 'Invalid doctor selected. Doctor record does not exist.' });
  }
  if (doctor.availability_status === 'ON_LEAVE') {
    return res.status(400).json({ error: 'Selected doctor is currently on leave. Please select another doctor.' });
  }

  // Validate appointment type
  const validTypes = ['ROUTINE_CHECKUP', 'FOLLOW_UP', 'SPECIALIST_CONSULTATION', 'EMERGENCY'];
  const aptType = validTypes.includes(type.toUpperCase()) ? type.toUpperCase() : 'ROUTINE_CHECKUP';

  // Generate unique appointment code
  const countRow = db.get('SELECT COUNT(*) as total FROM appointments');
  const nextNum = (countRow ? countRow.total : 0) + 1;
  const appointmentCode = `APT-${new Date().getFullYear()}-${String(nextNum).padStart(3, '0')}`;

  const insertSql = `
    INSERT INTO appointments (
      appointment_code, patient_id, doctor_id, department, appointment_date,
      appointment_time, type, status, notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'SCHEDULED', ?, ?)
  `;

  const result = db.run(insertSql, [
    appointmentCode,
    patientId,
    doctorId,
    department.trim(),
    appointmentDate,
    appointmentTime.trim(),
    aptType,
    notes ? notes.trim() : null,
    req.user.id
  ]);

  AuditLogger.logAction(req, 'APPOINTMENT', appointmentCode, 'SCHEDULE_APPOINTMENT', 'SUCCESS', {
    appointmentId: result.lastInsertRowid,
    appointmentCode,
    patientCode: patient.patient_code,
    doctorCode: doctor.doctor_code,
    date: appointmentDate
  });

  return res.status(201).json({
    message: 'Appointment scheduled successfully',
    appointment: {
      id: result.lastInsertRowid,
      appointmentCode,
      patientCode: patient.patient_code,
      patientName: patient.full_name,
      doctorName: doctor.full_name,
      appointmentDate,
      appointmentTime,
      status: 'SCHEDULED'
    }
  });
});

/**
 * PUT /api/appointments/:id/status
 * Update appointment status (SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED)
 */
router.put('/:id/status', (req, res) => {
  const appointmentId = parseInt(req.params.id, 10);
  const { status, notes } = req.body;

  if (!status || !['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(status.toUpperCase())) {
    return res.status(400).json({
      error: 'Invalid status. Must be SCHEDULED, IN_PROGRESS, COMPLETED, or CANCELLED.'
    });
  }

  const appointment = db.get('SELECT * FROM appointments WHERE id = ?', [appointmentId]);
  if (!appointment) {
    return res.status(404).json({ error: 'Appointment not found' });
  }

  // Authorization check: Admin & Receptionist can update any; Doctor can update their own
  const isAdmin = req.user.role === 'ADMIN';
  const isReceptionist = req.user.role === 'RECEPTIONIST';
  let isAssignedDoctor = false;

  if (req.user.role === 'DOCTOR') {
    const doc = db.get('SELECT id FROM doctors WHERE user_id = ?', [req.user.id]);
    if (doc && doc.id === appointment.doctor_id) {
      isAssignedDoctor = true;
    }
  }

  if (!isAdmin && !isReceptionist && !isAssignedDoctor) {
    return res.status(403).json({
      error: 'Access Denied: You do not have permission to update this appointment.'
    });
  }

  const newStatus = status.toUpperCase();
  db.run('UPDATE appointments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
    newStatus,
    appointmentId
  ]);

  AuditLogger.logAction(req, 'APPOINTMENT', appointment.appointment_code, 'UPDATE_STATUS', 'SUCCESS', {
    appointmentId,
    previousStatus: appointment.status,
    newStatus
  });

  return res.json({
    message: `Appointment status updated to ${newStatus}`,
    appointmentId,
    status: newStatus
  });
});

module.exports = router;
