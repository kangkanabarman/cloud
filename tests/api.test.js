// ==============================================================================
// MediCloud Automated Test Suite
// Verifies Security, RBAC, Data Validation, Backups, and Failure Boundaries
// ==============================================================================

const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../server');

describe('MediCloud Automated Security & Functional Test Suite', () => {
  let adminCookie = null;
  let doctorCookie = null;
  let receptionistCookie = null;

  // 1. HEALTH CHECK & MONITORING TESTS
  describe('System Health & Availability', () => {
    test('GET /api/health should return 200 OK with HEALTHY status and database connection', async () => {
      const res = await request(app).get('/api/health');
      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'HEALTHY');
      assert.equal(res.body.database.status, 'CONNECTED');
      assert.ok(res.body.uptimeSeconds >= 0);
      assert.ok(res.body.awsMonitoringBlueprint);
    });
  });

  // 2. AUTHENTICATION & SESSION TESTS
  describe('Authentication & Session Protection', () => {
    test('POST /api/auth/login should fail (401) with incorrect credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@medicloud.local', password: 'WrongPassword999!' });

      assert.equal(res.status, 401);
      assert.ok(res.body.error);
    });

    test('POST /api/auth/login should fail (400) when email or password is missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@medicloud.local' });

      assert.equal(res.status, 400);
      assert.equal(res.body.code, 'INVALID_CREDENTIALS');
    });

    test('POST /api/auth/login should succeed for ADMIN and set HttpOnly session cookie', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@medicloud.local', password: 'AdminPassword123!' });

      assert.equal(res.status, 200);
      assert.equal(res.body.user.role, 'ADMIN');
      const cookies = res.headers['set-cookie'];
      assert.ok(cookies);
      assert.ok(cookies.some(c => c.includes('medicloud.sid')));
      adminCookie = cookies;
    });

    test('POST /api/auth/login should succeed for DOCTOR', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'dr.chen@medicloud.local', password: 'DoctorPassword123!' });

      assert.equal(res.status, 200);
      assert.equal(res.body.user.role, 'DOCTOR');
      doctorCookie = res.headers['set-cookie'];
    });

    test('POST /api/auth/login should succeed for RECEPTIONIST', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'receptionist@medicloud.local', password: 'ReceptionPassword123!' });

      assert.equal(res.status, 200);
      assert.equal(res.body.user.role, 'RECEPTIONIST');
      receptionistCookie = res.headers['set-cookie'];
    });

    test('GET /api/auth/me should return 401 Unauthorized without session cookie', async () => {
      const res = await request(app).get('/api/auth/me');
      assert.equal(res.status, 401);
      assert.equal(res.body.code, 'AUTH_REQUIRED');
    });

    test('GET /api/auth/me should return authenticated user profile when cookie is present', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', adminCookie);

      assert.equal(res.status, 200);
      assert.equal(res.body.user.email, 'admin@medicloud.local');
      assert.equal(res.body.user.role, 'ADMIN');
    });

    test('POST /api/auth/logout should clear session and cookie', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', adminCookie);

      assert.equal(res.status, 200);
      assert.ok(res.body.message.includes('signed out'));
    });
  });

  // 3. ROLE-BASED ACCESS CONTROL (RBAC) & NEGATIVE TESTS
  describe('Role-Based Access Control (RBAC) & Privilege Separation', () => {
    // Re-login admin for subsequent tests
    before(async () => {
      const resAdmin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@medicloud.local', password: 'AdminPassword123!' });
      adminCookie = resAdmin.headers['set-cookie'];

      const resDoc = await request(app)
        .post('/api/auth/login')
        .send({ email: 'dr.chen@medicloud.local', password: 'DoctorPassword123!' });
      doctorCookie = resDoc.headers['set-cookie'];

      const resRec = await request(app)
        .post('/api/auth/login')
        .send({ email: 'receptionist@medicloud.local', password: 'ReceptionPassword123!' });
      receptionistCookie = resRec.headers['set-cookie'];
    });

    test('NEGATIVE TEST: Unauthenticated user accessing /api/patients receives 401', async () => {
      const res = await request(app).get('/api/patients');
      assert.equal(res.status, 401);
    });

    test('NEGATIVE TEST: Doctor accessing /api/users receives 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Cookie', doctorCookie);

      assert.equal(res.status, 403);
      assert.equal(res.body.code, 'FORBIDDEN_ROLE');
    });

    test('NEGATIVE TEST: Receptionist accessing /api/users receives 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Cookie', receptionistCookie);

      assert.equal(res.status, 403);
      assert.equal(res.body.code, 'FORBIDDEN_ROLE');
    });

    test('CRITICAL SECURITY REQUIREMENT: Receptionist accessing /api/medical-records receives 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/medical-records')
        .set('Cookie', receptionistCookie);

      assert.equal(res.status, 403);
      assert.equal(res.body.code, 'CLINICAL_PRIVILEGE_RESTRICTION');
    });

    test('CRITICAL SECURITY REQUIREMENT: Receptionist attempting to view patient medical history receives 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/medical-records/patient/1')
        .set('Cookie', receptionistCookie);

      assert.equal(res.status, 403);
      assert.equal(res.body.code, 'CLINICAL_PRIVILEGE_RESTRICTION');
    });

    test('Authorized Doctor CAN view clinical medical records (200 OK)', async () => {
      const res = await request(app)
        .get('/api/medical-records')
        .set('Cookie', doctorCookie);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.records));
    });

    test('Authorized Admin CAN view user management list (200 OK)', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Cookie', adminCookie);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.users));
      // Ensure password_hash is NEVER exposed in the API response
      assert.equal(res.body.users[0].password_hash, undefined);
    });
  });

  // 4. PATIENT MANAGEMENT & VALIDATION TESTS
  describe('Patient Management & Validation', () => {
    test('Receptionist can register a new fictional patient', async () => {
      const newPatient = {
        fullName: 'Test Fictional Subject Alpha',
        dob: '1990-05-15',
        gender: 'FEMALE',
        bloodGroup: 'B+',
        phone: '+1-555-9001',
        email: 'subject.alpha@example.com',
        allergies: 'None',
        status: 'ACTIVE'
      };

      const res = await request(app)
        .post('/api/patients')
        .set('Cookie', receptionistCookie)
        .send(newPatient);

      assert.equal(res.status, 201);
      assert.ok(res.body.patient.patientCode.startsWith('PT-'));
    });

    test('Patient registration fails (400) if required fullName is missing', async () => {
      const invalidPatient = {
        dob: '1990-05-15',
        gender: 'FEMALE',
        phone: '+1-555-9001'
      };

      const res = await request(app)
        .post('/api/patients')
        .set('Cookie', receptionistCookie)
        .send(invalidPatient);

      assert.equal(res.status, 400);
    });

    test('Patient listing supports search query and pagination', async () => {
      const res = await request(app)
        .get('/api/patients?q=fictional&page=1&limit=5')
        .set('Cookie', doctorCookie);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.pagination.total >= 1);
    });
  });

  // 5. APPOINTMENT SCHEDULING & TIME VALIDATION
  describe('Appointment Scheduling & Validation', () => {
    test('Scheduling an appointment for a PAST date is rejected (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .set('Cookie', receptionistCookie)
        .send({
          patientId: 1,
          doctorId: 1,
          department: 'Cardiology',
          appointmentDate: '2020-01-01', // Invalid past date
          appointmentTime: '10:00',
          type: 'ROUTINE_CHECKUP'
        });

      assert.equal(res.status, 400);
      assert.ok(res.body.error.includes('past date'));
    });

    test('Scheduling an appointment for an invalid patient ID is rejected (400)', async () => {
      const todayStr = new Date().toISOString().split('T')[0];
      const res = await request(app)
        .post('/api/appointments')
        .set('Cookie', receptionistCookie)
        .send({
          patientId: 99999, // Non-existent patient
          doctorId: 1,
          department: 'Cardiology',
          appointmentDate: todayStr,
          appointmentTime: '11:00',
          type: 'ROUTINE_CHECKUP'
        });

      assert.equal(res.status, 400);
      assert.ok(res.body.error.includes('Invalid patient'));
    });

    test('Scheduling a valid future appointment succeeds (201 Created)', async () => {
      const futureDate = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];
      const res = await request(app)
        .post('/api/appointments')
        .set('Cookie', receptionistCookie)
        .send({
          patientId: 1,
          doctorId: 1,
          department: 'Cardiology',
          appointmentDate: futureDate,
          appointmentTime: '14:30',
          type: 'SPECIALIST_CONSULTATION',
          notes: 'Routine cardiovascular follow-up'
        });

      assert.equal(res.status, 201);
      assert.ok(res.body.appointment.appointmentCode.startsWith('APT-'));
    });
  });

  // 6. CLINICAL MEDICAL RECORDS & PRIVILEGE ENFORCEMENT
  describe('Clinical Medical Records Creation', () => {
    test('Authorized Doctor CAN add a clinical note to a patient record', async () => {
      const res = await request(app)
        .post('/api/medical-records')
        .set('Cookie', doctorCookie)
        .send({
          patientId: 1,
          diagnosis: 'Mild Sinus Bradycardia (Fictional Test)',
          prescription: 'Hydration and rest; monitor heart rate weekly.',
          vitalSigns: { bp: '118/75', pulse: '58', temp: '98.6' },
          clinicalNotes: 'Resting pulse noted at 58 bpm during athletic evaluation. Asymptomatic.'
        });

      assert.equal(res.status, 201);
      assert.ok(res.body.record.recordCode.startsWith('MR-'));
    });

    test('NEGATIVE TEST: Non-doctor (Receptionist) CANNOT add clinical note (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/medical-records')
        .set('Cookie', receptionistCookie)
        .send({
          patientId: 1,
          diagnosis: 'Attempted clinical note',
          clinicalNotes: 'Should be blocked'
        });

      assert.equal(res.status, 403);
    });
  });

  // 7. BACKUP & DISASTER RECOVERY TESTS
  describe('Backup & Disaster Recovery Procedures', () => {
    let createdBackupId = null;

    test('NEGATIVE TEST: Doctor or Receptionist cannot trigger backups (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/backup')
        .set('Cookie', doctorCookie);

      assert.equal(res.status, 403);
    });

    test('Administrator can trigger cryptographic snapshot backup (201 Created)', async () => {
      const res = await request(app)
        .post('/api/backup')
        .set('Cookie', adminCookie);

      assert.equal(res.status, 201);
      assert.ok(res.body.backup.checksum);
      assert.ok(res.body.backup.backupFilename.endsWith('.sqlite'));
      createdBackupId = res.body.backup.backupId;
    });

    test('Administrator can verify backup cryptographic checksum', async () => {
      assert.ok(createdBackupId);
      const res = await request(app)
        .post(`/api/backup/${createdBackupId}/verify`)
        .set('Cookie', adminCookie);

      assert.equal(res.status, 200);
      assert.equal(res.body.verification.status, 'VERIFIED');
    });

    test('GET /api/backup/specs returns disaster recovery comparison (RPO and RTO)', async () => {
      const res = await request(app)
        .get('/api/backup/specs')
        .set('Cookie', adminCookie);

      assert.equal(res.status, 200);
      assert.ok(res.body.proposedAWSArchitecture.targetRPO);
      assert.ok(res.body.proposedAWSArchitecture.targetRTO);
    });
  });

  // 8. AUDIT LOGGING VERIFICATION
  describe('Audit Logging Verification', () => {
    test('Admin can retrieve audit logs containing recorded actions', async () => {
      const res = await request(app)
        .get('/api/audit-logs?limit=10')
        .set('Cookie', adminCookie);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.length > 0);
      // Ensure passwords are never present in audit logs
      const hasPassword = res.body.data.some(log => {
        const metaStr = JSON.stringify(log.metadata || {});
        return metaStr.includes('password') || metaStr.includes('AdminPassword');
      });
      assert.equal(hasPassword, false, 'Audit logs must NEVER contain passwords');
    });

    test('NEGATIVE TEST: Receptionist cannot access audit logs (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .set('Cookie', receptionistCookie);

      assert.equal(res.status, 403);
    });
  });
});
