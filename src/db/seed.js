// ==============================================================================
// Database Fictional Seeding Routine
// Academic Cloud Computing Case Study — Strict Fictional Data Only
// ==============================================================================

const bcrypt = require('bcryptjs');
const db = require('./index');

function seedDatabase() {
  // Check if users already seeded
  const existingUsers = db.query('SELECT COUNT(*) as count FROM users');
  if (existingUsers[0].count > 0) {
    return false; // Already seeded
  }

  const saltRounds = 12;
  const adminHash = bcrypt.hashSync('AdminPassword123!', saltRounds);
  const doctorHash = bcrypt.hashSync('DoctorPassword123!', saltRounds);
  const receptionistHash = bcrypt.hashSync('ReceptionPassword123!', saltRounds);

  db.transaction(() => {
    // 1. Seed Users
    const insertUser = `
      INSERT INTO users (username, email, password_hash, role, full_name, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.run(insertUser, ['admin', 'admin@medicloud.local', adminHash, 'ADMIN', 'Dr. Arthur Pendelton (Admin)', 'ACTIVE']);
    db.run(insertUser, ['dr_chen', 'dr.chen@medicloud.local', doctorHash, 'DOCTOR', 'Dr. Samantha Chen, MD', 'ACTIVE']);
    db.run(insertUser, ['dr_patel', 'dr.patel@medicloud.local', doctorHash, 'DOCTOR', 'Dr. Rajesh Patel, MD', 'ACTIVE']);
    db.run(insertUser, ['dr_thorne', 'dr.thorne@medicloud.local', doctorHash, 'DOCTOR', 'Dr. Emily Thorne, MD', 'ACTIVE']);
    db.run(insertUser, ['receptionist', 'receptionist@medicloud.local', receptionistHash, 'RECEPTIONIST', 'Maria Santos (Front Desk)', 'ACTIVE']);

    const userRows = db.query('SELECT id, email, role FROM users');
    const userMap = {};
    userRows.forEach(u => { userMap[u.email] = u.id; });

    // 2. Seed Doctors
    const insertDoctor = `
      INSERT INTO doctors (user_id, doctor_code, full_name, department, specialization, email, phone, availability_status, room_number)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(insertDoctor, [
      userMap['dr.chen@medicloud.local'], 'DOC-101', 'Dr. Samantha Chen, MD',
      'Cardiology', 'Interventional Cardiology & Electrophysiology',
      'dr.chen@medicloud.local', '+1-555-0201', 'AVAILABLE', 'Suite 304'
    ]);

    db.run(insertDoctor, [
      userMap['dr.patel@medicloud.local'], 'DOC-102', 'Dr. Rajesh Patel, MD',
      'Neurology', 'Neuro-oncology & Cognitive Neurology',
      'dr.patel@medicloud.local', '+1-555-0202', 'AVAILABLE', 'Suite 218'
    ]);

    db.run(insertDoctor, [
      userMap['dr.thorne@medicloud.local'], 'DOC-103', 'Dr. Emily Thorne, MD',
      'Pediatrics', 'Pediatric Critical Care & Cardiology',
      'dr.thorne@medicloud.local', '+1-555-0203', 'IN_CONSULTATION', 'Suite 105'
    ]);

    db.run(insertDoctor, [
      null, 'DOC-104', 'Dr. Marcus Vance, MD',
      'Orthopedics', 'Trauma, Sports Medicine & Joint Reconstruction',
      'dr.vance@medicloud.local', '+1-555-0204', 'AVAILABLE', 'Suite 412'
    ]);

    db.run(insertDoctor, [
      null, 'DOC-105', 'Dr. Sarah Jenkins, MD',
      'General Medicine', 'Internal Medicine & Preventative Care',
      'dr.jenkins@medicloud.local', '+1-555-0205', 'ON_LEAVE', 'Suite 101'
    ]);

    // 3. Seed Fictional Patients
    const insertPatient = `
      INSERT INTO patients (
        patient_code, full_name, dob, gender, blood_group, phone, email,
        address, emergency_contact_name, emergency_contact_phone, allergies, status, registered_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const receptionistId = userMap['receptionist@medicloud.local'];

    db.run(insertPatient, [
      'PT-2024-001', 'John Doe (Fictional)', '1985-04-12', 'MALE', 'O+',
      '+1-555-0101', 'john.doe.fictional@example.com', '124 Academic Way, Tech City',
      'Sarah Doe (Spouse)', '+1-555-0191', 'Penicillin, Cephalosporins', 'ACTIVE', receptionistId
    ]);

    db.run(insertPatient, [
      'PT-2024-002', 'Elena Vance (Fictional)', '1992-09-24', 'FEMALE', 'A+',
      '+1-555-0102', 'elena.vance.fictional@example.com', '742 Cloudview Blvd, Sector 4',
      'Gordon Vance (Brother)', '+1-555-0192', 'None', 'ACTIVE', receptionistId
    ]);

    db.run(insertPatient, [
      'PT-2024-003', 'Marcus Holloway (Fictional)', '1978-11-05', 'MALE', 'B-',
      '+1-555-0103', 'marcus.h.fictional@example.com', '88 Silicon Drive, Suite 12',
      'Clara Holloway (Sister)', '+1-555-0193', 'Sulfa antibiotics', 'INPATIENT', receptionistId
    ]);

    db.run(insertPatient, [
      'PT-2024-004', 'Clara Oswald (Fictional)', '1999-01-18', 'FEMALE', 'AB+',
      '+1-555-0104', 'clara.o.fictional@example.com', '500 Nebula Ave, City Center',
      'Danny Oswald (Father)', '+1-555-0194', 'Latex, Aspirin', 'ACTIVE', receptionistId
    ]);

    db.run(insertPatient, [
      'PT-2024-005', 'Henry Wu (Fictional)', '1964-07-30', 'MALE', 'O-',
      '+1-555-0105', 'henry.wu.fictional@example.com', '19 Genesis Ridge, West End',
      'Mei Wu (Daughter)', '+1-555-0195', 'Aspirin', 'DISCHARGED', receptionistId
    ]);

    db.run(insertPatient, [
      'PT-2024-006', 'Sophie Turner (Fictional)', '2003-12-14', 'FEMALE', 'B+',
      '+1-555-0106', 'sophie.t.fictional@example.com', '310 Riverdale Rd, North Hills',
      'Rachel Turner (Mother)', '+1-555-0196', 'None', 'ACTIVE', receptionistId
    ]);

    db.run(insertPatient, [
      'PT-2024-007', 'David Kim (Fictional)', '1980-03-22', 'MALE', 'A-',
      '+1-555-0107', 'david.kim.fictional@example.com', '45 Harbor Point, Bay Area',
      'Grace Kim (Wife)', '+1-555-0197', 'NSAIDs', 'ACTIVE', receptionistId
    ]);

    db.run(insertPatient, [
      'PT-2024-008', 'Amara Okafor (Fictional)', '1995-08-11', 'FEMALE', 'O+',
      '+1-555-0108', 'amara.o.fictional@example.com', '92 Horizon Parkway, Uptown',
      'Chidi Okafor (Brother)', '+1-555-0198', 'Peanuts, Shellfish', 'ACTIVE', receptionistId
    ]);

    const patientRows = db.query('SELECT id, patient_code FROM patients');
    const patientMap = {};
    patientRows.forEach(p => { patientMap[p.patient_code] = p.id; });

    const doctorRows = db.query('SELECT id, doctor_code FROM doctors');
    const docMap = {};
    doctorRows.forEach(d => { docMap[d.doctor_code] = d.id; });

    // 4. Seed Appointments
    const insertApt = `
      INSERT INTO appointments (
        appointment_code, patient_id, doctor_id, department, appointment_date,
        appointment_time, type, status, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 6 * 86400000).toISOString().split('T')[0];

    db.run(insertApt, [
      'APT-2024-001', patientMap['PT-2024-001'], docMap['DOC-101'], 'Cardiology',
      today, '09:00', 'SPECIALIST_CONSULTATION', 'IN_PROGRESS',
      'Follow-up evaluation on post-exercise ECG report', receptionistId
    ]);

    db.run(insertApt, [
      'APT-2024-002', patientMap['PT-2024-002'], docMap['DOC-102'], 'Neurology',
      today, '10:30', 'ROUTINE_CHECKUP', 'SCHEDULED',
      'Migraine management and preventative screening consultation', receptionistId
    ]);

    db.run(insertApt, [
      'APT-2024-003', patientMap['PT-2024-003'], docMap['DOC-104'], 'Orthopedics',
      today, '14:00', 'SPECIALIST_CONSULTATION', 'SCHEDULED',
      'Knee joint pain assessment following physical therapy', receptionistId
    ]);

    db.run(insertApt, [
      'APT-2024-004', patientMap['PT-2024-004'], docMap['DOC-103'], 'Pediatrics',
      tomorrow, '11:15', 'ROUTINE_CHECKUP', 'SCHEDULED',
      'Annual pediatric wellness assessment & routine immunizations', receptionistId
    ]);

    db.run(insertApt, [
      'APT-2024-005', patientMap['PT-2024-005'], docMap['DOC-101'], 'Cardiology',
      nextWeek, '15:30', 'FOLLOW_UP', 'SCHEDULED',
      'Bi-annual cardiac health checkup and lipid monitoring review', receptionistId
    ]);

    db.run(insertApt, [
      'APT-2024-006', patientMap['PT-2024-006'], docMap['DOC-102'], 'Neurology',
      today, '08:30', 'ROUTINE_CHECKUP', 'COMPLETED',
      'Routine neurological reflex examination and sensory testing', receptionistId
    ]);

    // 5. Seed Medical Records (Protected Clinical Notes)
    const insertRec = `
      INSERT INTO medical_records (
        record_code, patient_id, doctor_id, diagnosis, prescription, vital_signs, clinical_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(insertRec, [
      'MR-2024-001', patientMap['PT-2024-001'], docMap['DOC-101'],
      'Stage 1 Essential Hypertension (Fictional Condition)',
      'Amlodipine 5mg oral daily; dietary sodium restriction advice provided.',
      JSON.stringify({ bp: '136/88 mmHg', pulse: '74 bpm', temp: '98.4 F', spo2: '99%' }),
      'Patient reports mild exertional dyspnea when climbing two flights of stairs. Resting ECG normal sinus rhythm. Advised ambulatory BP monitoring and 30-day follow-up.'
    ]);

    db.run(insertRec, [
      'MR-2024-002', patientMap['PT-2024-002'], docMap['DOC-102'],
      'Episodic Tension-Type Headache with Photophobia (Fictional)',
      'Acetaminophen 500mg as needed; magnesium glycinate supplement recommended.',
      JSON.stringify({ bp: '118/76 mmHg', pulse: '68 bpm', temp: '98.6 F', spo2: '100%' }),
      'Cranial nerve examination intact (II-XII). No focal neurological deficits. Symptoms correlate with prolonged computer monitor exposure. Ergonomic adjustments advised.'
    ]);

    db.run(insertRec, [
      'MR-2024-003', patientMap['PT-2024-003'], docMap['DOC-104'],
      'Right Patellofemoral Pain Syndrome (Fictional)',
      'Topical diclofenac gel 1% BID; physical therapy referral for quadriceps strengthening.',
      JSON.stringify({ bp: '122/80 mmHg', pulse: '72 bpm', temp: '98.2 F', spo2: '98%' }),
      'Mild crepitus noted on active extension. Ligamentous stability confirmed (Lachman negative, anterior drawer negative). X-rays demonstrate preserved joint spaces.'
    ]);

    // 6. Seed Initial Audit Logs
    const insertAudit = `
      INSERT INTO audit_logs (
        event_type, actor_id, actor_username, actor_role, target_resource, target_id,
        action, status, ip_address, user_agent, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(insertAudit, [
      'SYSTEM_INITIALIZE', 1, 'admin', 'ADMIN', 'SYSTEM_DATABASE', 'SCHEMA_V1',
      'INITIALIZE_DATABASE', 'SUCCESS', '127.0.0.1', 'Node/CLI',
      JSON.stringify({ message: 'Academic prototype database initialized with fictional seed data' })
    ]);

    db.run(insertAudit, [
      'SECURITY_POLICY_CHECK', 1, 'admin', 'ADMIN', 'ACCESS_CONTROL', 'RBAC_CONFIG',
      'VERIFY_ROLE_MATRIX', 'SUCCESS', '127.0.0.1', 'Node/CLI',
      JSON.stringify({ activeRoles: ['ADMIN', 'DOCTOR', 'RECEPTIONIST'], denyByDefault: true })
    ]);
  });

  return true;
}

module.exports = { seedDatabase };
