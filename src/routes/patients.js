// ==============================================================================
// MediCloud Patient Management Routes
// Handles fictional patient registration, listings, pagination, and demographic updates
// ==============================================================================

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { requireReceptionistOrAdmin, requireStaff } = require('../middleware/rbac');
const AuditLogger = require('../utils/auditLogger');

const router = express.Router();

// All patient endpoints require an active authenticated session
router.use(requireAuth);

/**
 * GET /api/patients
 * List patients with pagination, search, and status filtering
 * Safe projection: Omits sensitive fields in list view
 */
router.get('/', requireStaff, (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const offset = (page - 1) * limit;
  const search = req.query.q ? req.query.q.trim() : '';
  const statusFilter = req.query.status ? req.query.status.trim() : '';

  let countSql = 'SELECT COUNT(*) as total FROM patients WHERE 1=1';
  let dataSql = `
    SELECT
      id, patient_code, full_name, dob, gender, blood_group,
      phone, status, created_at
    FROM patients
    WHERE 1=1
  `;
  const params = [];
  const countParams = [];

  if (search) {
    const searchClause = ' AND (patient_code LIKE ? OR full_name LIKE ?)';
    countSql += searchClause;
    dataSql += searchClause;
    const wild = `%${search}%`;
    params.push(wild, wild);
    countParams.push(wild, wild);
  }

  if (statusFilter && ['ACTIVE', 'INPATIENT', 'DISCHARGED'].includes(statusFilter)) {
    const statusClause = ' AND status = ?';
    countSql += statusClause;
    dataSql += statusClause;
    params.push(statusFilter);
    countParams.push(statusFilter);
  }

  dataSql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const totalRecord = db.get(countSql, countParams);
  const total = totalRecord ? totalRecord.total : 0;
  const patients = db.query(dataSql, params);

  return res.json({
    data: patients,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  });
});

/**
 * GET /api/patients/:id
 * Retrieve detailed demographic profile of a single patient
 */
router.get('/:id', requireStaff, (req, res) => {
  const patientId = parseInt(req.params.id, 10);
  if (isNaN(patientId)) {
    return res.status(400).json({ error: 'Invalid patient ID format' });
  }

  const patient = db.get(`
    SELECT
      p.*,
      u.full_name as registered_by_name
    FROM patients p
    LEFT JOIN users u ON p.registered_by = u.id
    WHERE p.id = ?
  `, [patientId]);

  if (!patient) {
    return res.status(404).json({ error: 'Patient record not found' });
  }

  return res.json({ patient });
});

/**
 * POST /api/patients
 * Register a new fictional patient (Admin & Receptionist only)
 */
router.post('/', requireReceptionistOrAdmin, (req, res) => {
  const {
    fullName,
    dob,
    gender,
    bloodGroup,
    phone,
    email,
    address,
    emergencyContactName,
    emergencyContactPhone,
    allergies,
    status = 'ACTIVE'
  } = req.body;

  // Validation
  if (!fullName || !fullName.trim()) {
    return res.status(400).json({ error: 'Patient full name is required' });
  }
  if (!dob || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
    return res.status(400).json({ error: 'Valid Date of Birth (YYYY-MM-DD) is required' });
  }
  if (!gender || !['MALE', 'FEMALE', 'OTHER'].includes(gender.toUpperCase())) {
    return res.status(400).json({ error: 'Gender must be MALE, FEMALE, or OTHER' });
  }
  if (!phone || !phone.trim()) {
    return res.status(400).json({ error: 'Patient contact phone is required' });
  }

  // Generate unique fictional patient code
  const countRow = db.get('SELECT COUNT(*) as total FROM patients');
  const nextNum = (countRow ? countRow.total : 0) + 1;
  const patientCode = `PT-${new Date().getFullYear()}-${String(nextNum).padStart(3, '0')}`;

  const insertSql = `
    INSERT INTO patients (
      patient_code, full_name, dob, gender, blood_group, phone, email,
      address, emergency_contact_name, emergency_contact_phone, allergies, status, registered_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const result = db.run(insertSql, [
    patientCode,
    fullName.trim(),
    dob,
    gender.toUpperCase(),
    bloodGroup ? bloodGroup.trim() : null,
    phone.trim(),
    email ? email.trim() : null,
    address ? address.trim() : null,
    emergencyContactName ? emergencyContactName.trim() : null,
    emergencyContactPhone ? emergencyContactPhone.trim() : null,
    allergies ? allergies.trim() : 'None known',
    status.toUpperCase(),
    req.user.id
  ]);

  AuditLogger.logAction(req, 'PATIENT', patientCode, 'REGISTER_PATIENT', 'SUCCESS', {
    patientId: result.lastInsertRowid,
    patientCode,
    registeredBy: req.user.username
  });

  return res.status(201).json({
    message: 'Fictional patient registered successfully',
    patient: {
      id: result.lastInsertRowid,
      patientCode,
      fullName: fullName.trim(),
      status: status.toUpperCase()
    }
  });
});

/**
 * PUT /api/patients/:id
 * Update demographic data (Admin & Receptionist only)
 */
router.put('/:id', requireReceptionistOrAdmin, (req, res) => {
  const patientId = parseInt(req.params.id, 10);
  if (isNaN(patientId)) {
    return res.status(400).json({ error: 'Invalid patient ID format' });
  }

  const patient = db.get('SELECT * FROM patients WHERE id = ?', [patientId]);
  if (!patient) {
    return res.status(404).json({ error: 'Patient record not found' });
  }

  const {
    phone,
    email,
    address,
    emergencyContactName,
    emergencyContactPhone,
    allergies,
    status
  } = req.body;

  const validStatuses = ['ACTIVE', 'INPATIENT', 'DISCHARGED'];
  const newStatus = status && validStatuses.includes(status.toUpperCase())
    ? status.toUpperCase()
    : patient.status;

  const updateSql = `
    UPDATE patients SET
      phone = ?,
      email = ?,
      address = ?,
      emergency_contact_name = ?,
      emergency_contact_phone = ?,
      allergies = ?,
      status = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  db.run(updateSql, [
    phone !== undefined ? phone.trim() : patient.phone,
    email !== undefined ? email.trim() : patient.email,
    address !== undefined ? address.trim() : patient.address,
    emergencyContactName !== undefined ? emergencyContactName.trim() : patient.emergency_contact_name,
    emergencyContactPhone !== undefined ? emergencyContactPhone.trim() : patient.emergency_contact_phone,
    allergies !== undefined ? allergies.trim() : patient.allergies,
    newStatus,
    patientId
  ]);

  AuditLogger.logAction(req, 'PATIENT', patient.patient_code, 'UPDATE_DEMOGRAPHICS', 'SUCCESS', {
    patientId,
    patientCode: patient.patient_code,
    updatedFields: Object.keys(req.body)
  });

  return res.json({
    message: 'Patient demographic information updated successfully',
    patientId
  });
});

module.exports = router;
