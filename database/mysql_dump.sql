-- ==============================================================================
-- MediCloud Database Export for Amazon RDS for MySQL 8.0
-- Generated on: 2026-10-12T17:46:57.802Z
-- Target Environment: AWS Elastic Beanstalk + Multi-AZ Amazon RDS
-- ==============================================================================

-- ==============================================================================
-- MediCloud — Production Target Schema (Amazon RDS for MySQL 8.0)
-- Academic Cloud Computing FT-III Case Study
-- Features: InnoDB engine, utf8mb4 encoding, strict foreign key constraints
-- ==============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. USERS & AUTHENTICATION TABLE
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('ADMIN', 'DOCTOR', 'RECEPTIONIST') NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    status ENUM('ACTIVE', 'DISABLED') DEFAULT 'ACTIVE',
    last_login_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_email (email),
    INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. DOCTORS TABLE
CREATE TABLE IF NOT EXISTS doctors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE NULL,
    doctor_code VARCHAR(30) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    department VARCHAR(100) NOT NULL,
    specialization VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    availability_status ENUM('AVAILABLE', 'IN_CONSULTATION', 'ON_LEAVE') DEFAULT 'AVAILABLE',
    room_number VARCHAR(20) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_doctors_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_doctors_dept (department),
    INDEX idx_doctors_code (doctor_code),
    INDEX idx_doctors_avail (availability_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. FICTIONAL PATIENTS TABLE
CREATE TABLE IF NOT EXISTS patients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_code VARCHAR(30) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    dob DATE NOT NULL,
    gender ENUM('MALE', 'FEMALE', 'OTHER') NOT NULL,
    blood_group VARCHAR(10) NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255) NULL,
    address TEXT NULL,
    emergency_contact_name VARCHAR(150) NULL,
    emergency_contact_phone VARCHAR(50) NULL,
    allergies TEXT NULL,
    status ENUM('ACTIVE', 'INPATIENT', 'DISCHARGED') DEFAULT 'ACTIVE',
    registered_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_patients_creator FOREIGN KEY (registered_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_patients_code (patient_code),
    INDEX idx_patients_name (full_name),
    INDEX idx_patients_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. APPOINTMENTS TABLE
CREATE TABLE IF NOT EXISTS appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    appointment_code VARCHAR(30) NOT NULL UNIQUE,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    department VARCHAR(100) NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time VARCHAR(10) NOT NULL,
    type ENUM('ROUTINE_CHECKUP', 'FOLLOW_UP', 'SPECIALIST_CONSULTATION', 'EMERGENCY') DEFAULT 'ROUTINE_CHECKUP',
    status ENUM('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') DEFAULT 'SCHEDULED',
    notes TEXT NULL,
    created_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_app_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    CONSTRAINT fk_app_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE RESTRICT,
    CONSTRAINT fk_app_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_appointments_date (appointment_date),
    INDEX idx_appointments_doctor (doctor_id),
    INDEX idx_appointments_patient (patient_id),
    INDEX idx_appointments_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. PROTECTED MEDICAL RECORDS TABLE
CREATE TABLE IF NOT EXISTS medical_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    record_code VARCHAR(30) NOT NULL UNIQUE,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    diagnosis TEXT NOT NULL,
    prescription TEXT NULL,
    vital_signs TEXT NULL,
    clinical_notes TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_records_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    CONSTRAINT fk_records_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE RESTRICT,
    INDEX idx_records_patient (patient_id),
    INDEX idx_records_doctor (doctor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. SECURITY & OPERATIONAL AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    actor_id INT NULL,
    actor_username VARCHAR(100) NULL,
    actor_role VARCHAR(50) NULL,
    target_resource VARCHAR(100) NULL,
    target_id VARCHAR(100) NULL,
    action VARCHAR(100) NOT NULL,
    status ENUM('SUCCESS', 'FAILURE', 'BLOCKED') NOT NULL,
    ip_address VARCHAR(60) NULL,
    user_agent VARCHAR(255) NULL,
    metadata JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_event (event_type),
    INDEX idx_audit_actor (actor_username),
    INDEX idx_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. BACKUP METADATA TABLE
CREATE TABLE IF NOT EXISTS backup_metadata (
    id INT AUTO_INCREMENT PRIMARY KEY,
    backup_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    checksum_sha256 VARCHAR(64) NOT NULL,
    backup_type VARCHAR(50) DEFAULT 'MANUAL_SNAPSHOT',
    status ENUM('COMPLETED', 'FAILED', 'VERIFIED') DEFAULT 'COMPLETED',
    created_by INT NULL,
    verified_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_backup_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_backups_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;


-- DATA MIGRATION INSERTS --

-- Table: users
INSERT INTO users (id, username, email, password_hash, role, full_name, status, last_login_at, created_at, updated_at) VALUES (1, 'admin', 'admin@medicloud.local', '$2b$12$T40X5CTSZZmkZ/j7G70l6u1nY9p5THw5BhDCw4lo81o/Lmxs.Ssk.', 'ADMIN', 'Dr. Arthur Pendelton (Admin)', 'ACTIVE', '2026-10-12 17:30:17', '2026-10-12 10:19:25', '2026-10-12 10:19:25');
INSERT INTO users (id, username, email, password_hash, role, full_name, status, last_login_at, created_at, updated_at) VALUES (2, 'dr_chen', 'dr.chen@medicloud.local', '$2b$12$qGyV4Kzp4AsGcgOiJBLNeu.qAYIOO9ofvZb.rPxq./ZltuuVt46wq', 'DOCTOR', 'Dr. Samantha Chen, MD', 'ACTIVE', '2026-10-12 17:30:17', '2026-10-12 10:19:25', '2026-10-12 10:19:25');
INSERT INTO users (id, username, email, password_hash, role, full_name, status, last_login_at, created_at, updated_at) VALUES (3, 'dr_patel', 'dr.patel@medicloud.local', '$2b$12$qGyV4Kzp4AsGcgOiJBLNeu.qAYIOO9ofvZb.rPxq./ZltuuVt46wq', 'DOCTOR', 'Dr. Rajesh Patel, MD', 'ACTIVE', NULL, '2026-10-12 10:19:25', '2026-10-12 10:19:25');
INSERT INTO users (id, username, email, password_hash, role, full_name, status, last_login_at, created_at, updated_at) VALUES (4, 'dr_thorne', 'dr.thorne@medicloud.local', '$2b$12$qGyV4Kzp4AsGcgOiJBLNeu.qAYIOO9ofvZb.rPxq./ZltuuVt46wq', 'DOCTOR', 'Dr. Emily Thorne, MD', 'ACTIVE', NULL, '2026-10-12 10:19:25', '2026-10-12 10:19:25');
INSERT INTO users (id, username, email, password_hash, role, full_name, status, last_login_at, created_at, updated_at) VALUES (5, 'receptionist', 'receptionist@medicloud.local', '$2b$12$2qXBUxpyrqDCL3TM7cmSjOOiiD73BFHkYIPFs9YOF3L8K2EANjWSK', 'RECEPTIONIST', 'Maria Santos (Front Desk)', 'ACTIVE', '2026-10-12 17:30:18', '2026-10-12 10:19:25', '2026-10-12 10:19:25');

-- Table: doctors
INSERT INTO doctors (id, user_id, doctor_code, full_name, department, specialization, email, phone, availability_status, room_number, created_at) VALUES (1, 2, 'DOC-101', 'Dr. Samantha Chen, MD', 'Cardiology', 'Interventional Cardiology & Electrophysiology', 'dr.chen@medicloud.local', '+1-555-0201', 'AVAILABLE', 'Suite 304', '2026-10-12 10:19:25');
INSERT INTO doctors (id, user_id, doctor_code, full_name, department, specialization, email, phone, availability_status, room_number, created_at) VALUES (2, 3, 'DOC-102', 'Dr. Rajesh Patel, MD', 'Neurology', 'Neuro-oncology & Cognitive Neurology', 'dr.patel@medicloud.local', '+1-555-0202', 'AVAILABLE', 'Suite 218', '2026-10-12 10:19:25');
INSERT INTO doctors (id, user_id, doctor_code, full_name, department, specialization, email, phone, availability_status, room_number, created_at) VALUES (3, 4, 'DOC-103', 'Dr. Emily Thorne, MD', 'Pediatrics', 'Pediatric Critical Care & Cardiology', 'dr.thorne@medicloud.local', '+1-555-0203', 'IN_CONSULTATION', 'Suite 105', '2026-10-12 10:19:25');
INSERT INTO doctors (id, user_id, doctor_code, full_name, department, specialization, email, phone, availability_status, room_number, created_at) VALUES (4, NULL, 'DOC-104', 'Dr. Marcus Vance, MD', 'Orthopedics', 'Trauma, Sports Medicine & Joint Reconstruction', 'dr.vance@medicloud.local', '+1-555-0204', 'AVAILABLE', 'Suite 412', '2026-10-12 10:19:25');
INSERT INTO doctors (id, user_id, doctor_code, full_name, department, specialization, email, phone, availability_status, room_number, created_at) VALUES (5, NULL, 'DOC-105', 'Dr. Sarah Jenkins, MD', 'General Medicine', 'Internal Medicine & Preventative Care', 'dr.jenkins@medicloud.local', '+1-555-0205', 'ON_LEAVE', 'Suite 101', '2026-10-12 10:19:25');

-- Table: patients
INSERT INTO patients (id, patient_code, full_name, dob, gender, blood_group, phone, email, address, emergency_contact_name, emergency_contact_phone, allergies, status, registered_by, created_at, updated_at) VALUES (1, 'PT-2024-001', 'John Doe (Fictional)', '1985-04-12', 'MALE', 'O+', '+1-555-0101', 'john.doe.fictional@example.com', '124 Academic Way, Tech City', 'Sarah Doe (Spouse)', '+1-555-0191', 'Penicillin, Cephalosporins', 'ACTIVE', 5, '2026-10-12 10:19:25', '2026-10-12 10:19:25');
INSERT INTO patients (id, patient_code, full_name, dob, gender, blood_group, phone, email, address, emergency_contact_name, emergency_contact_phone, allergies, status, registered_by, created_at, updated_at) VALUES (2, 'PT-2024-002', 'Elena Vance (Fictional)', '1992-09-24', 'FEMALE', 'A+', '+1-555-0102', 'elena.vance.fictional@example.com', '742 Cloudview Blvd, Sector 4', 'Gordon Vance (Brother)', '+1-555-0192', 'None', 'ACTIVE', 5, '2026-10-12 10:19:25', '2026-10-12 10:19:25');
INSERT INTO patients (id, patient_code, full_name, dob, gender, blood_group, phone, email, address, emergency_contact_name, emergency_contact_phone, allergies, status, registered_by, created_at, updated_at) VALUES (3, 'PT-2024-003', 'Marcus Holloway (Fictional)', '1978-11-05', 'MALE', 'B-', '+1-555-0103', 'marcus.h.fictional@example.com', '88 Silicon Drive, Suite 12', 'Clara Holloway (Sister)', '+1-555-0193', 'Sulfa antibiotics', 'INPATIENT', 5, '2026-10-12 10:19:25', '2026-10-12 10:19:25');
INSERT INTO patients (id, patient_code, full_name, dob, gender, blood_group, phone, email, address, emergency_contact_name, emergency_contact_phone, allergies, status, registered_by, created_at, updated_at) VALUES (4, 'PT-2024-004', 'Clara Oswald (Fictional)', '1999-01-18', 'FEMALE', 'AB+', '+1-555-0104', 'clara.o.fictional@example.com', '500 Nebula Ave, City Center', 'Danny Oswald (Father)', '+1-555-0194', 'Latex, Aspirin', 'ACTIVE', 5, '2026-10-12 10:19:25', '2026-10-12 10:19:25');
INSERT INTO patients (id, patient_code, full_name, dob, gender, blood_group, phone, email, address, emergency_contact_name, emergency_contact_phone, allergies, status, registered_by, created_at, updated_at) VALUES (5, 'PT-2024-005', 'Henry Wu (Fictional)', '1964-07-30', 'MALE', 'O-', '+1-555-0105', 'henry.wu.fictional@example.com', '19 Genesis Ridge, West End', 'Mei Wu (Daughter)', '+1-555-0195', 'Aspirin', 'DISCHARGED', 5, '2026-10-12 10:19:25', '2026-10-12 10:19:25');
INSERT INTO patients (id, patient_code, full_name, dob, gender, blood_group, phone, email, address, emergency_contact_name, emergency_contact_phone, allergies, status, registered_by, created_at, updated_at) VALUES (6, 'PT-2024-006', 'Sophie Turner (Fictional)', '2003-12-14', 'FEMALE', 'B+', '+1-555-0106', 'sophie.t.fictional@example.com', '310 Riverdale Rd, North Hills', 'Rachel Turner (Mother)', '+1-555-0196', 'None', 'ACTIVE', 5, '2026-10-12 10:19:25', '2026-10-12 10:19:25');
INSERT INTO patients (id, patient_code, full_name, dob, gender, blood_group, phone, email, address, emergency_contact_name, emergency_contact_phone, allergies, status, registered_by, created_at, updated_at) VALUES (7, 'PT-2024-007', 'David Kim (Fictional)', '1980-03-22', 'MALE', 'A-', '+1-555-0107', 'david.kim.fictional@example.com', '45 Harbor Point, Bay Area', 'Grace Kim (Wife)', '+1-555-0197', 'NSAIDs', 'ACTIVE', 5, '2026-10-12 10:19:25', '2026-10-12 10:19:25');
INSERT INTO patients (id, patient_code, full_name, dob, gender, blood_group, phone, email, address, emergency_contact_name, emergency_contact_phone, allergies, status, registered_by, created_at, updated_at) VALUES (8, 'PT-2024-008', 'Amara Okafor (Fictional)', '1995-08-11', 'FEMALE', 'O+', '+1-555-0108', 'amara.o.fictional@example.com', '92 Horizon Parkway, Uptown', 'Chidi Okafor (Brother)', '+1-555-0198', 'Peanuts, Shellfish', 'ACTIVE', 5, '2026-10-12 10:19:25', '2026-10-12 10:19:25');
INSERT INTO patients (id, patient_code, full_name, dob, gender, blood_group, phone, email, address, emergency_contact_name, emergency_contact_phone, allergies, status, registered_by, created_at, updated_at) VALUES (9, 'PT-2026-009', 'Test Fictional Subject Alpha', '1990-05-15', 'FEMALE', 'B+', '+1-555-9001', 'subject.alpha@example.com', NULL, NULL, NULL, 'None', 'ACTIVE', 5, '2026-10-12 17:30:18', '2026-10-12 17:30:18');

-- Table: appointments
INSERT INTO appointments (id, appointment_code, patient_id, doctor_id, department, appointment_date, appointment_time, type, status, notes, created_by, created_at, updated_at) VALUES (1, 'APT-2024-001', 1, 1, 'Cardiology', '2026-10-12', '09:00', 'SPECIALIST_CONSULTATION', 'IN_PROGRESS', 'Follow-up evaluation on post-exercise ECG report', 5, '2026-10-12 10:19:25', '2026-10-12 10:19:25');
INSERT INTO appointments (id, appointment_code, patient_id, doctor_id, department, appointment_date, appointment_time, type, status, notes, created_by, created_at, updated_at) VALUES (2, 'APT-2024-002', 2, 2, 'Neurology', '2026-10-12', '10:30', 'ROUTINE_CHECKUP', 'SCHEDULED', 'Migraine management and preventative screening consultation', 5, '2026-10-12 10:19:25', '2026-10-12 10:19:25');
INSERT INTO appointments (id, appointment_code, patient_id, doctor_id, department, appointment_date, appointment_time, type, status, notes, created_by, created_at, updated_at) VALUES (3, 'APT-2024-003', 3, 4, 'Orthopedics', '2026-10-12', '14:00', 'SPECIALIST_CONSULTATION', 'SCHEDULED', 'Knee joint pain assessment following physical therapy', 5, '2026-10-12 10:19:25', '2026-10-12 10:19:25');
INSERT INTO appointments (id, appointment_code, patient_id, doctor_id, department, appointment_date, appointment_time, type, status, notes, created_by, created_at, updated_at) VALUES (4, 'APT-2024-004', 4, 3, 'Pediatrics', '2026-10-13', '11:15', 'ROUTINE_CHECKUP', 'SCHEDULED', 'Annual pediatric wellness assessment & routine immunizations', 5, '2026-10-12 10:19:25', '2026-10-12 10:19:25');
INSERT INTO appointments (id, appointment_code, patient_id, doctor_id, department, appointment_date, appointment_time, type, status, notes, created_by, created_at, updated_at) VALUES (5, 'APT-2024-005', 5, 1, 'Cardiology', '2026-10-18', '15:30', 'FOLLOW_UP', 'SCHEDULED', 'Bi-annual cardiac health checkup and lipid monitoring review', 5, '2026-10-12 10:19:25', '2026-10-12 10:19:25');
INSERT INTO appointments (id, appointment_code, patient_id, doctor_id, department, appointment_date, appointment_time, type, status, notes, created_by, created_at, updated_at) VALUES (6, 'APT-2024-006', 6, 2, 'Neurology', '2026-10-12', '08:30', 'ROUTINE_CHECKUP', 'COMPLETED', 'Routine neurological reflex examination and sensory testing', 5, '2026-10-12 10:19:25', '2026-10-12 10:19:25');
INSERT INTO appointments (id, appointment_code, patient_id, doctor_id, department, appointment_date, appointment_time, type, status, notes, created_by, created_at, updated_at) VALUES (7, 'APT-2026-007', 1, 1, 'Cardiology', '2026-10-15', '14:30', 'SPECIALIST_CONSULTATION', 'SCHEDULED', 'Routine cardiovascular follow-up', 5, '2026-10-12 17:30:18', '2026-10-12 17:30:18');

-- Table: medical_records
INSERT INTO medical_records (id, record_code, patient_id, doctor_id, diagnosis, prescription, vital_signs, clinical_notes, created_at, updated_at) VALUES (1, 'MR-2024-001', 1, 1, 'Stage 1 Essential Hypertension (Fictional Condition)', 'Amlodipine 5mg oral daily; dietary sodium restriction advice provided.', '{"bp":"136/88 mmHg","pulse":"74 bpm","temp":"98.4 F","spo2":"99%"}', 'Patient reports mild exertional dyspnea when climbing two flights of stairs. Resting ECG normal sinus rhythm. Advised ambulatory BP monitoring and 30-day follow-up.', '2026-10-12 10:19:25', '2026-10-12 10:19:25');
INSERT INTO medical_records (id, record_code, patient_id, doctor_id, diagnosis, prescription, vital_signs, clinical_notes, created_at, updated_at) VALUES (2, 'MR-2024-002', 2, 2, 'Episodic Tension-Type Headache with Photophobia (Fictional)', 'Acetaminophen 500mg as needed; magnesium glycinate supplement recommended.', '{"bp":"118/76 mmHg","pulse":"68 bpm","temp":"98.6 F","spo2":"100%"}', 'Cranial nerve examination intact (II-XII). No focal neurological deficits. Symptoms correlate with prolonged computer monitor exposure. Ergonomic adjustments advised.', '2026-10-12 10:19:25', '2026-10-12 10:19:25');
INSERT INTO medical_records (id, record_code, patient_id, doctor_id, diagnosis, prescription, vital_signs, clinical_notes, created_at, updated_at) VALUES (3, 'MR-2024-003', 3, 4, 'Right Patellofemoral Pain Syndrome (Fictional)', 'Topical diclofenac gel 1% BID; physical therapy referral for quadriceps strengthening.', '{"bp":"122/80 mmHg","pulse":"72 bpm","temp":"98.2 F","spo2":"98%"}', 'Mild crepitus noted on active extension. Ligamentous stability confirmed (Lachman negative, anterior drawer negative). X-rays demonstrate preserved joint spaces.', '2026-10-12 10:19:25', '2026-10-12 10:19:25');
INSERT INTO medical_records (id, record_code, patient_id, doctor_id, diagnosis, prescription, vital_signs, clinical_notes, created_at, updated_at) VALUES (4, 'MR-2026-004', 1, 1, 'Mild Sinus Bradycardia (Fictional Test)', 'Hydration and rest; monitor heart rate weekly.', '{"bp":"118/75","pulse":"58","temp":"98.6"}', 'Resting pulse noted at 58 bpm during athletic evaluation. Asymptomatic.', '2026-10-12 17:30:18', '2026-10-12 17:30:18');

-- Table: audit_logs
INSERT INTO audit_logs (id, event_type, actor_id, actor_username, actor_role, target_resource, target_id, action, status, ip_address, user_agent, metadata, created_at) VALUES (1, 'SYSTEM_INITIALIZE', 1, 'admin', 'ADMIN', 'SYSTEM_DATABASE', 'SCHEMA_V1', 'INITIALIZE_DATABASE', 'SUCCESS', '127.0.0.1', 'Node/CLI', '{"message":"Academic prototype database initialized with fictional seed data"}', '2026-10-12 10:19:25');
INSERT INTO audit_logs (id, event_type, actor_id, actor_username, actor_role, target_resource, target_id, action, status, ip_address, user_agent, metadata, created_at) VALUES (2, 'SECURITY_POLICY_CHECK', 1, 'admin', 'ADMIN', 'ACCESS_CONTROL', 'RBAC_CONFIG', 'VERIFY_ROLE_MATRIX', 'SUCCESS', '127.0.0.1', 'Node/CLI', '{"activeRoles":["ADMIN","DOCTOR","RECEPTIONIST"],"denyByDefault":true}', '2026-10-12 10:19:25');
INSERT INTO audit_logs (id, event_type, actor_id, actor_username, actor_role, target_resource, target_id, action, status, ip_address, user_agent, metadata, created_at) VALUES (3, 'AUTH_LOGIN_FAILED', NULL, 'admin@medicloud.local', 'ANONYMOUS', 'AUTH_SESSION', NULL, 'USER_LOGIN_ATTEMPT', 'FAILURE', '127.0.0.1', 'Unknown Agent', '{"reason":"Incorrect password"}', '2026-10-12 17:30:16');
INSERT INTO audit_logs (id, event_type, actor_id, actor_username, actor_role, target_resource, target_id, action, status, ip_address, user_agent, metadata, created_at) VALUES (4, 'AUTH_LOGIN_FAILED', NULL, 'admin@medicloud.local', 'ANONYMOUS', 'AUTH_SESSION', NULL, 'USER_LOGIN_ATTEMPT', 'FAILURE', '127.0.0.1', 'Unknown Agent', '{"reason":"Missing email or password"}', '2026-10-12 17:30:16');
INSERT INTO audit_logs (id, event_type, actor_id, actor_username, actor_role, target_resource, target_id, action, status, ip_address, user_agent, metadata, created_at) VALUES (5, 'AUTH_LOGIN_SUCCESS', 1, 'admin', 'ADMIN', 'AUTH_SESSION', '1', 'USER_LOGIN', 'SUCCESS', '127.0.0.1', 'Unknown Agent', '{"email":"admin@medicloud.local","role":"ADMIN"}', '2026-10-12 17:30:16');
INSERT INTO audit_logs (id, event_type, actor_id, actor_username, actor_role, target_resource, target_id, action, status, ip_address, user_agent, metadata, created_at) VALUES (6, 'AUTH_LOGIN_SUCCESS', 2, 'dr_chen', 'DOCTOR', 'AUTH_SESSION', '2', 'USER_LOGIN', 'SUCCESS', '127.0.0.1', 'Unknown Agent', '{"email":"dr.chen@medicloud.local","role":"DOCTOR"}', '2026-10-12 17:30:17');
INSERT INTO audit_logs (id, event_type, actor_id, actor_username, actor_role, target_resource, target_id, action, status, ip_address, user_agent, metadata, created_at) VALUES (7, 'AUTH_LOGIN_SUCCESS', 5, 'receptionist', 'RECEPTIONIST', 'AUTH_SESSION', '5', 'USER_LOGIN', 'SUCCESS', '127.0.0.1', 'Unknown Agent', '{"email":"receptionist@medicloud.local","role":"RECEPTIONIST"}', '2026-10-12 17:30:17');
INSERT INTO audit_logs (id, event_type, actor_id, actor_username, actor_role, target_resource, target_id, action, status, ip_address, user_agent, metadata, created_at) VALUES (8, 'AUTH_LOGOUT', 1, 'admin', 'ADMIN', 'AUTH_SESSION', '1', 'USER_LOGOUT', 'SUCCESS', '127.0.0.1', 'Unknown Agent', '{"message":"Session invalidated gracefully"}', '2026-10-12 17:30:17');
INSERT INTO audit_logs (id, event_type, actor_id, actor_username, actor_role, target_resource, target_id, action, status, ip_address, user_agent, metadata, created_at) VALUES (9, 'AUTH_LOGIN_SUCCESS', 1, 'admin', 'ADMIN', 'AUTH_SESSION', '1', 'USER_LOGIN', 'SUCCESS', '127.0.0.1', 'Unknown Agent', '{"email":"admin@medicloud.local","role":"ADMIN"}', '2026-10-12 17:30:17');
INSERT INTO audit_logs (id, event_type, actor_id, actor_username, actor_role, target_resource, target_id, action, status, ip_address, user_agent, metadata, created_at) VALUES (10, 'AUTH_LOGIN_SUCCESS', 2, 'dr_chen', 'DOCTOR', 'AUTH_SESSION', '2', 'USER_LOGIN', 'SUCCESS', '127.0.0.1', 'Unknown Agent', '{"email":"dr.chen@medicloud.local","role":"DOCTOR"}', '2026-10-12 17:30:17');
INSERT INTO audit_logs (id, event_type, actor_id, actor_username, actor_role, target_resource, target_id, action, status, ip_address, user_agent, metadata, created_at) VALUES (11, 'AUTH_LOGIN_SUCCESS', 5, 'receptionist', 'RECEPTIONIST', 'AUTH_SESSION', '5', 'USER_LOGIN', 'SUCCESS', '127.0.0.1', 'Unknown Agent', '{"email":"receptionist@medicloud.local","role":"RECEPTIONIST"}', '2026-10-12 17:30:18');
INSERT INTO audit_logs (id, event_type, actor_id, actor_username, actor_role, target_resource, target_id, action, status, ip_address, user_agent, metadata, created_at) VALUES (12, 'UNAUTHORIZED_ACCESS_ATTEMPT', 2, 'dr_chen', 'DOCTOR', '/api/users/', NULL, 'GET', 'BLOCKED', '127.0.0.1', 'Unknown Agent', '{"userRole":"DOCTOR","allowedRoles":["ADMIN"],"method":"GET","path":"/api/users"}', '2026-10-12 17:30:18');
INSERT INTO audit_logs (id, event_type, actor_id, actor_username, actor_role, target_resource, target_id, action, status, ip_address, user_agent, metadata, created_at) VALUES (13, 'UNAUTHORIZED_ACCESS_ATTEMPT', 5, 'receptionist', 'RECEPTIONIST', '/api/users/', NULL, 'GET', 'BLOCKED', '127.0.0.1', 'Unknown Agent', '{"userRole":"RECEPTIONIST","allowedRoles":["ADMIN"],"method":"GET","path":"/api/users"}', '2026-10-12 17:30:18');
INSERT INTO audit_logs (id, event_type, actor_id, actor_username, actor_role, target_resource, target_id, action, status, ip_address, user_agent, metadata, created_at) VALUES (14, 'RECEPTIONIST_CLINICAL_ACCESS_BLOCKED', 5, 'receptionist', 'RECEPTIONIST', 'MEDICAL_RECORDS', NULL, 'GET', 'BLOCKED', '127.0.0.1', 'Unknown Agent', '{"reason":"Receptionist role is strictly forbidden from accessing sensitive clinical notes"}', '2026-10-12 17:30:18');
INSERT INTO audit_logs (id, event_type, actor_id, actor_username, actor_role, target_resource, target_id, action, status, ip_address, user_agent, metadata, created_at) VALUES (15, 'RECEPTIONIST_CLINICAL_ACCESS_BLOCKED', 5, 'receptionist', 'RECEPTIONIST', 'MEDICAL_RECORDS', NULL, 'GET', 'BLOCKED', '127.0.0.1', 'Unknown Agent', '{"reason":"Receptionist role is strictly forbidden from accessing sensitive clinical notes"}', '2026-10-12 17:30:18');
INSERT INTO audit_logs (id, event_type, actor_id, actor_username, actor_role, target_resource, target_id, action, status, ip_address, user_agent, metadata, created_at) VALUES (16, 'MEDICAL_RECORD_VIEW_CLINICAL_LIST', 2, 'dr_chen', 'DOCTOR', 'MEDICAL_RECORD', 'BATCH_QUERY', 'VIEW_CLINICAL_LIST', 'SUCCESS', '127.0.0.1', 'Unknown Agent', '{"recordCount":1}', '2026-10-12 17:30:18');
INSERT INTO audit_logs (id, event_type, actor_id, actor_username, actor_role, target_resource, target_id, action, status, ip_address, user_agent, metadata, created_at) VALUES (17, 'PATIENT_REGISTER_PATIENT', 5, 'receptionist', 'RECEPTIONIST', 'PATIENT', 'PT-2026-009', 'REGISTER_PATIENT', 'SUCCESS', '127.0.0.1', 'Unknown Agent', '{"patientId":9,"patientCode":"PT-2026-009","registeredBy":"receptionist"}', '2026-10-12 17:30:18');
INSERT INTO audit_logs (id, event_type, actor_id, actor_username, actor_role, target_resource, target_id, action, status, ip_address, user_agent, metadata, created_at) VALUES (18, 'APPOINTMENT_SCHEDULE_APPOINTMENT', 5, 'receptionist', 'RECEPTIONIST', 'APPOINTMENT', 'APT-2026-007', 'SCHEDULE_APPOINTMENT', 'SUCCESS', '127.0.0.1', 'Unknown Agent', '{"appointmentId":7,"appointmentCode":"APT-2026-007","patientCode":"PT-2024-001","doctorCode":"DOC-101","date":"2026-10-15"}', '2026-10-12 17:30:18');
INSERT INTO audit_logs (id, event_type, actor_id, actor_username, actor_role, target_resource, target_id, action, status, ip_address, user_agent, metadata, created_at) VALUES (19, 'MEDICAL_RECORD_CREATE_CLINICAL_NOTE', 2, 'dr_chen', 'DOCTOR', 'MEDICAL_RECORD', 'MR-2026-004', 'CREATE_CLINICAL_NOTE', 'SUCCESS', '127.0.0.1', 'Unknown Agent', '{"recordId":4,"recordCode":"MR-2026-004","patientCode":"PT-2024-001","doctorCode":"DOC-101"}', '2026-10-12 17:30:18');
INSERT INTO audit_logs (id, event_type, actor_id, actor_username, actor_role, target_resource, target_id, action, status, ip_address, user_agent, metadata, created_at) VALUES (20, 'RECEPTIONIST_CLINICAL_ACCESS_BLOCKED', 5, 'receptionist', 'RECEPTIONIST', 'MEDICAL_RECORDS', NULL, 'POST', 'BLOCKED', '127.0.0.1', 'Unknown Agent', '{"reason":"Receptionist role is strictly forbidden from accessing sensitive clinical notes"}', '2026-10-12 17:30:18');
INSERT INTO audit_logs (id, event_type, actor_id, actor_username, actor_role, target_resource, target_id, action, status, ip_address, user_agent, metadata, created_at) VALUES (21, 'UNAUTHORIZED_ACCESS_ATTEMPT', 2, 'dr_chen', 'DOCTOR', '/api/backup/', NULL, 'POST', 'BLOCKED', '127.0.0.1', 'Unknown Agent', '{"userRole":"DOCTOR","allowedRoles":["ADMIN"],"method":"POST","path":"/api/backup"}', '2026-10-12 17:30:18');
INSERT INTO audit_logs (id, event_type, actor_id, actor_username, actor_role, target_resource, target_id, action, status, ip_address, user_agent, metadata, created_at) VALUES (22, 'BACKUP_CREATED', 1, 'admin', 'ADMIN', 'BACKUP_SNAPSHOT', 'medicloud_backup_2026-10-12T17-30-18-127Z.sqlite', 'CREATE_BACKUP', 'SUCCESS', 'unknown', 'unknown', '{"fileSize":155648,"checksum":"bd459ebe4fd83f490f3560ade3258e39246b46e2e78db3b6269ec09e722d8141","backupId":1}', '2026-10-12 17:30:18');
INSERT INTO audit_logs (id, event_type, actor_id, actor_username, actor_role, target_resource, target_id, action, status, ip_address, user_agent, metadata, created_at) VALUES (23, 'UNAUTHORIZED_ACCESS_ATTEMPT', 5, 'receptionist', 'RECEPTIONIST', '/api/audit-logs/', NULL, 'GET', 'BLOCKED', '127.0.0.1', 'Unknown Agent', '{"userRole":"RECEPTIONIST","allowedRoles":["ADMIN"],"method":"GET","path":"/api/audit-logs"}', '2026-10-12 17:30:18');

-- Table: backup_metadata
INSERT INTO backup_metadata (id, backup_filename, file_path, file_size_bytes, checksum_sha256, backup_type, status, created_by, verified_at, created_at) VALUES (1, 'medicloud_backup_2026-10-12T17-30-18-127Z.sqlite', '/Users/kangkanabarman/Downloads/cloud computing/data/backups/medicloud_backup_2026-10-12T17-30-18-127Z.sqlite', 155648, 'bd459ebe4fd83f490f3560ade3258e39246b46e2e78db3b6269ec09e722d8141', 'MANUAL_SNAPSHOT', 'VERIFIED', 1, '2026-10-12 17:30:18', '2026-10-12 17:30:18');

