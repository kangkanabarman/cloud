// ==============================================================================
// MediCloud Medical Records (Clinical Notes) Module
// Strictly protected clinical records — Receptionists are strictly forbidden (403)
// ==============================================================================

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { canAccessClinicalNotes, requireDoctor } = require('../middleware/rbac');
const AuditLogger = require('../utils/auditLogger');

const router = express.Router();
router.use(requireAuth);
// Apply strict clinical notes access guard
router.use(canAccessClinicalNotes);

/**
 * GET /api/medical-records
 * List medical records with patient and doctor details
 * Allowed: DOCTOR, ADMIN. (RECEPTIONIST is blocked with 403 by canAccessClinicalNotes)
 */
router.get('/', (req, res) => {
  const { patientId, doctorId } = req.query;

  let sql = `
    SELECT
      mr.id, mr.record_code, mr.diagnosis, mr.prescription, mr.vital_signs,
      mr.clinical_notes, mr.created_at, mr.updated_at,
      p.id as patient_id, p.patient_code, p.full_name as patient_name, p.dob, p.allergies,
      d.id as doctor_id, d.doctor_code, d.full_name as doctor_name, d.department
    FROM medical_records mr
    JOIN patients p ON mr.patient_id = p.id
    JOIN doctors d ON mr.doctor_id = d.id
    WHERE 1=1
  `;
  const params = [];

  if (patientId) {
    sql += ' AND mr.patient_id = ?';
    params.push(parseInt(patientId, 10));
  }

  // If doctor, they can filter by doctor or view patient
  if (req.user.role === 'DOCTOR' && !patientId) {
    const doc = db.get('SELECT id FROM doctors WHERE user_id = ?', [req.user.id]);
    if (doc) {
      sql += ' AND mr.doctor_id = ?';
      params.push(doc.id);
    }
  } else if (doctorId) {
    sql += ' AND mr.doctor_id = ?';
    params.push(parseInt(doctorId, 10));
  }

  sql += ' ORDER BY mr.created_at DESC LIMIT 50';
  const records = db.query(sql, params);

  // Parse vital_signs JSON string safely
  const formatted = records.map(r => {
    let parsedVitals = null;
    try {
      if (r.vital_signs) parsedVitals = JSON.parse(r.vital_signs);
    } catch (e) {
      parsedVitals = { raw: r.vital_signs };
    }
    return {
      ...r,
      vital_signs: parsedVitals
    };
  });

  AuditLogger.logAction(req, 'MEDICAL_RECORD', 'BATCH_QUERY', 'VIEW_CLINICAL_LIST', 'SUCCESS', {
    recordCount: formatted.length
  });

  return res.json({ records: formatted });
});

/**
 * GET /api/medical-records/patient/:patientId
 * Retrieve complete clinical history for a single fictional patient
 */
router.get('/patient/:patientId', (req, res) => {
  const patientId = parseInt(req.params.patientId, 10);
  if (isNaN(patientId)) {
    return res.status(400).json({ error: 'Invalid patient ID format' });
  }

  const patient = db.get('SELECT id, patient_code, full_name, dob, gender, blood_group, allergies FROM patients WHERE id = ?', [
    patientId
  ]);

  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  const records = db.query(`
    SELECT
      mr.id, mr.record_code, mr.diagnosis, mr.prescription, mr.vital_signs,
      mr.clinical_notes, mr.created_at,
      d.doctor_code, d.full_name as doctor_name, d.department
    FROM medical_records mr
    JOIN doctors d ON mr.doctor_id = d.id
    WHERE mr.patient_id = ?
    ORDER BY mr.created_at DESC
  `, [patientId]);

  const formatted = records.map(r => {
    let parsedVitals = null;
    try {
      if (r.vital_signs) parsedVitals = JSON.parse(r.vital_signs);
    } catch (e) {
      parsedVitals = null;
    }
    return { ...r, vital_signs: parsedVitals };
  });

  AuditLogger.logAction(req, 'MEDICAL_RECORD', patient.patient_code, 'VIEW_PATIENT_HISTORY', 'SUCCESS', {
    patientCode: patient.patient_code,
    historyCount: formatted.length
  });

  return res.json({
    patient,
    records: formatted
  });
});

/**
 * POST /api/medical-records
 * Add a new clinical note with diagnosis and prescription
 * STRICTLY DOCTORS ONLY (requireDoctor)
 */
router.post('/', requireDoctor, (req, res) => {
  const {
    patientId,
    diagnosis,
    prescription,
    vitalSigns,
    clinicalNotes
  } = req.body;

  if (!patientId || !diagnosis || !clinicalNotes) {
    return res.status(400).json({
      error: 'Please provide patientId, diagnosis, and clinicalNotes.'
    });
  }

  // Identify the doctor profile for the current authenticated user
  const doctor = db.get('SELECT id, doctor_code, full_name FROM doctors WHERE user_id = ?', [req.user.id]);
  if (!doctor) {
    return res.status(403).json({
      error: 'Current user does not have an active Doctor profile linked in the system.'
    });
  }

  // Validate patient existence
  const patient = db.get('SELECT id, patient_code FROM patients WHERE id = ?', [patientId]);
  if (!patient) {
    return res.status(404).json({ error: 'Patient record not found' });
  }

  // Generate unique clinical record code
  const countRow = db.get('SELECT COUNT(*) as total FROM medical_records');
  const nextNum = (countRow ? countRow.total : 0) + 1;
  const recordCode = `MR-${new Date().getFullYear()}-${String(nextNum).padStart(3, '0')}`;

  const vitalsJson = typeof vitalSigns === 'object' ? JSON.stringify(vitalSigns) : (vitalSigns || '{}');

  const insertSql = `
    INSERT INTO medical_records (
      record_code, patient_id, doctor_id, diagnosis, prescription, vital_signs, clinical_notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const result = db.run(insertSql, [
    recordCode,
    patientId,
    doctor.id,
    diagnosis.trim(),
    prescription ? prescription.trim() : null,
    vitalsJson,
    clinicalNotes.trim()
  ]);

  // Log non-sensitive audit entry (NO diagnosis text or clinical notes logged)
  AuditLogger.logAction(req, 'MEDICAL_RECORD', recordCode, 'CREATE_CLINICAL_NOTE', 'SUCCESS', {
    recordId: result.lastInsertRowid,
    recordCode,
    patientCode: patient.patient_code,
    doctorCode: doctor.doctor_code
  });

  return res.status(201).json({
    message: 'Clinical record created successfully',
    record: {
      id: result.lastInsertRowid,
      recordCode,
      patientCode: patient.patient_code,
      doctorName: doctor.full_name,
      diagnosis: diagnosis.trim()
    }
  });
});

module.exports = router;
