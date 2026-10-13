# MediCloud — Cloud-Based Hospital Management System (HMS)
### Academic Cloud Computing FT-III Case Study & Prototype

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/kangkanabarman/cloud)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/kangkanabarman/cloud)
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/kangkanabarman/cloud)

> [!IMPORTANT]
> **Academic Safety & Compliance Notice:**
> - **Educational Prototype Only:** This application is designed strictly as an academic case study for **Cloud Computing FT-III**. It must not be presented as a production-ready clinical system.
> - **Fictional Data Only:** All patient identities, demographics, medical conditions, and doctor records in this repository and database are entirely fictional.
> - **Regulatory Assessment Disclaimer:** No claim of formal compliance with healthcare regulations (such as the HIPAA Security Rule or GDPR) is made without an institutional assessment and Business Associate Agreement (BAA).
> - **Zero Hard-Coded Credentials:** No real AWS credentials, secrets, or production passwords exist in this source code.

---

## 1. Project Overview

**MediCloud** is a full-stack, responsive cloud-based Hospital Management System developed to demonstrate enterprise cloud principles:
- **Managed Database Architecture:** Transitioning from an initial modular SQLite database to **Amazon RDS for MySQL 8.0 Multi-AZ**.
- **Role-Based Access Control (RBAC):** Strict server-side privilege separation across `ADMIN`, `DOCTOR`, and `RECEPTIONIST` roles, enforcing the Principle of Least Privilege and preventing horizontal privilege escalation.
- **Defense-in-Depth Security:** Salted `bcryptjs` password hashing (12 rounds), HttpOnly/SameSite session security, Helmet HTTP headers, IP rate limiting, and 100% parameterized SQL queries.
- **Disaster Recovery & Business Continuity:** Local SHA-256 cryptographic snapshots with pre-restore safeguard backups, alongside AWS Multi-AZ automated backups with **RPO < 5 minutes** and **RTO < 15 minutes**.
- **Observability:** Centralized audit logging, live system telemetry (`/api/health`), response-time tracking, and production **Amazon CloudWatch** alarm blueprints.

---

## 2. System Architecture

### 2.1 Proposed AWS Cloud Production Architecture

```
                                  [ Authorized Users & Clinicians ]
                                                  |
                                                  | HTTPS (TLS 1.3)
                                                  v
                                     [ Amazon Route 53 DNS ]
                                                  |
                                                  v
                                     [ AWS WAF & CloudFront ]
                                                  |
                                                  v
                        +---------------------------------------------------+
                        |             Amazon VPC (10.0.0.0/16)              |
                        |                                                   |
                        |  [ Public Subnets: AZ-A & AZ-B ]                 |
                        |    Application Load Balancer (ALB)                |
                        |    Health Check: /api/health                      |
                        |               |                                   |
                        |               | Forward HTTP:8080                 |
                        |               v                                   |
                        |  [ Private App Subnets: AZ-A & AZ-B ]             |
                        |    AWS Elastic Beanstalk (Auto Scaling Group)     |
                        |    Node.js Express Application Containers         |
                        |         |                      |                  |
                        |         | TLS                  | VPC Endpoint     |
                        |         v                      v                  |
                        |  [ Private DB Subnets ]   [ Amazon S3 Vault ]     |
                        |    Amazon RDS MySQL 8.0     SSE-KMS Encrypted     |
                        |    Primary <-> Standby      Block Public Access   |
                        |    (Synchronous Multi-AZ)                         |
                        +---------------------------------------------------+
                                        |                        |
                                        v                        v
                              [ Amazon CloudWatch ]     [ AWS IAM & Roles ]
                                Logs, Metrics, Alarms     Least-Privilege Execution
```

```mermaid
flowchart TD
    User([Authorized Staff / User]) -->|HTTPS TLS 1.3| Route53[Amazon Route 53 DNS]
    Route53 --> WAF[AWS WAF / CloudFront]
    WAF --> ALB[Application Load Balancer\nPublic Subnets Multi-AZ]
    ALB -->|HTTP 8080 Health: /api/health| ASG[AWS Elastic Beanstalk\nNode.js Express in Private Subnets]
    ASG -->|Private Security Group| RDS[(Amazon RDS for MySQL 8.0\nMulti-AZ Primary & Standby)]
    ASG -->|VPC Gateway Endpoint| S3[(Amazon S3 Bucket\nSSE-KMS Encrypted Documents)]
    ASG -->|Log Streaming| CW[Amazon CloudWatch Logs & Metrics]
    ASG -->|API Activity Audit| CT[AWS CloudTrail]
    IAM[AWS IAM Least Privilege Roles] -.-> ASG
    IAM -.-> RDS
    IAM -.-> S3
```

### 2.2 Local Prototype Runtime Architecture
- **Web Server:** Node.js (v26.10.0) with Express.js 4.21.2.
- **Embedded Database:** Native `node:sqlite` abstraction layer with Write-Ahead Logging (WAL) and enforced foreign keys.
- **Frontend Client:** Single-Page Application (SPA) in Vanilla HTML5, modern CSS3 design system, and vanilla JavaScript.
- **Automated Test Runner:** Node.js built-in `node:test` test runner and `supertest`.

---

## 3. Core Features Across 12 Pages / Views

| # | Page / View | Access Level | Description & Core Capabilities |
|---|---|---|---|
| 1 | **Login** | Public / All | 1-Click rapid demo role buttons (`Admin`, `Doctor Chen`, `Doctor Patel`, `Receptionist`), secure credential form, rate limiting notice, HttpOnly sessions. |
| 2 | **Main Dashboard** | Authenticated | Live KPIs (Total Patients, Today's Appointments, Available Clinicians, DB Query Latency), Today's Queue table, quick actions, and server telemetry. |
| 3 | **Patient Management** | Staff | Paginated fictional patient directory, search by patient ID or name, demographic details modal, demographic editing (Admin/Receptionist). |
| 4 | **Doctor Management** | Staff | Doctor directory by department (Cardiology, Neurology, Pediatrics, Orthopedics, General Medicine), availability toggle, schedule inspector, profile creation (Admin). |
| 5 | **Appointments** | Staff | Booking modal with patient/doctor validation, past-date prevention, time slot picker, queue table, status workflows (Scheduled -> In Progress -> Completed/Cancelled). |
| 6 | **Medical Records** | **Doctors & Admin (Receptionist Blocked: 403)** | Clinical notes, fictional diagnoses, prescriptions, vital signs (BP, Pulse, Temp, SpO2). Receptionists receive styled **403 Forbidden Access Prohibited** demonstration. |
| 7 | **User & Role Management** | **Admin Only (403 for others)** | Provision staff users, assign roles (`ADMIN`, `DOCTOR`, `RECEPTIONIST`), enable/disable accounts (with self-disable prevention), visual RBAC Privilege Matrix. |
| 8 | **Audit Logs** | **Admin Only (403 for others)** | Security & operational audit trail (`AUTH_LOGIN_SUCCESS`, `UNAUTHORIZED_ACCESS_ATTEMPT`, `BACKUP_CREATED`, etc.), status filters, JSON export, CloudTrail explainer. |
| 9 | **Backup & Recovery** | **Admin Only (403 for others)** | Trigger live SQLite snapshot, calculate SHA-256 checksums, verify integrity, test safe restoration with mandatory pre-restore safeguard, RPO/RTO specifications. |
| 10 | **Cloud Architecture** | All | Interactive visual architecture diagram, tier-by-tier flow, and five deep-dive pillar analyses (Managed DB, RBAC, Encryption, Backups, Monitoring). |
| 11 | **Security & Monitoring** | All | Live health telemetry from `/api/health`, process memory (V8 Heap), HTTP response status distribution, active defense checklist, production CloudWatch alarms guide. |
| 12 | **Technical Evaluation** | All | Live in-browser test runner ("Run Live RBAC Scan", "Run Real-Time Query Benchmark"), availability calculation, negative security tests, compliance checklist, interactive AWS Cost Estimator. |

---

## 4. Technology Stack

- **Frontend:**
  - Semantic HTML5 with accessibility attributes and descriptive IDs.
  - Vanilla CSS3 with custom properties (CSS variables), modern healthcare palette (Navy `#0f2b46`, Teal `#0d9488`, Light Blue `#e0f2fe`), responsive layouts (Grid & Flexbox), modals, and toasts.
  - Vanilla JavaScript (ES6+ modular architecture, fetch wrapper, client-side hash router).
- **Backend:**
  - Node.js (v26.10.0 runtime).
  - Express.js 4.21.2.
  - `helmet` 8.0.0 (Content Security Policy, X-Frame-Options, HSTS).
  - `express-session` with `cookie-parser` (HttpOnly, SameSite=Lax).
  - `bcryptjs` 2.4.3 (12 salt rounds).
  - `express-rate-limit` 7.5.0 (Brute-force auth limiter and API limiter).
- **Database:**
  - **Local Development:** Native SQLite with Write-Ahead Logging (`PRAGMA journal_mode = WAL;`) and enforced relational integrity (`PRAGMA foreign_keys = ON;`).
  - **Production Target:** Amazon RDS for MySQL 8.0 Multi-AZ deployment.
- **Cloud Infrastructure Targets:**
  - **Compute:** AWS Elastic Beanstalk (Node.js 20.x on AL2023 with Nginx reverse proxy).
  - **Networking:** Amazon VPC across 2 Availability Zones with Public and Private Subnets.
  - **Storage:** Amazon S3 with SSE-KMS Customer-Managed Keys and Block Public Access.
  - **Observability:** Amazon CloudWatch Logs, Metrics, Alarms, and AWS CloudTrail.
  - **Security & IAM:** AWS IAM least-privilege instance profiles and security groups.

---

## 5. Folder Structure

```
medicloud/
├── package.json                   # Dependencies, test scripts, and migration runners
├── server.js                      # Express application entrypoint, middlewares, and routes
├── Procfile                       # AWS Elastic Beanstalk web process declaration
├── .env.example                   # Environment variable template with safe placeholders
├── .gitignore                     # Git exclusions (.env, databases, backups, logs)
├── README.md                      # Comprehensive academic documentation & viva guide
├── .ebextensions/
│   └── 01_app.config              # Elastic Beanstalk environment & ALB configuration
├── database/
│   ├── schema.sql                 # SQLite DDL with indexes and foreign keys
│   ├── schema_mysql.sql           # Production Amazon RDS MySQL 8.0 DDL
│   └── mysql_dump.sql             # Exported MySQL data migration dump (generated)
├── data/
│   └── backups/                   # Private directory for local snapshot backups
├── src/
│   ├── config/
│   │   └── index.js               # Application configuration and environment parser
│   ├── db/
│   │   ├── index.js               # Database access layer (query, get, run, transaction)
│   │   ├── init.js                # Schema initialization runner
│   │   └── seed.js                # Fictional development seed generator (users, docs, patients)
│   ├── middleware/
│   │   ├── auth.js                # Session verification and user deserialization
│   │   ├── rbac.js                # Deny-by-default role authorization guards
│   │   ├── rateLimiter.js         # API and brute-force authentication rate limiters
│   │   └── errorHandler.js        # Safe centralized error handler
│   ├── routes/
│   │   ├── auth.js                # Login, logout, session status, demo accounts
│   │   ├── patients.js            # Fictional patient CRUD, search, pagination
│   │   ├── doctors.js             # Doctor directory, departments, availability status
│   │   ├── appointments.js        # Appointment booking, date validation, status workflow
│   │   ├── medicalRecords.js      # Protected clinical records (Doctor allowed, Receptionist 403)
│   │   ├── users.js               # User and role administration (Admin only)
│   │   ├── audit.js               # Audit log query, filtering, and JSON export (Admin only)
│   │   ├── backup.js              # Snapshot backup trigger, SHA-256 verify, safe restore
│   │   ├── health.js              # Health-check endpoint (/api/health) and ALB blueprint
│   │   └── evaluation.js          # Live RBAC evaluation, latency benchmark, cost model
│   └── utils/
│       ├── auditLogger.js         # Sanitized non-sensitive audit logging engine
│       ├── backupService.js       # SQLite snapshot, cryptographic hashing, and safe restore
│       └── metrics.js             # Live runtime performance and telemetry collector
├── public/
│   ├── index.html                 # Main application shell with sidebar and topbar
│   ├── css/
│   │   └── styles.css             # Healthcare UI design system (Navy, Teal, Light Blue)
│   └── js/
│       ├── api.js                 # Fetch client wrapper and toast notifications
│       ├── auth.js                # Client authentication controller & demo role switcher
│       ├── router.js              # Client-side hash routing engine
│       ├── app.js                 # Application bootstrap and global event listeners
│       └── views/
│           ├── dashboardView.js   # KPI cards, queue table, and telemetry widget
│           ├── patientsView.js    # Patient directory, registration modal, demographic editing
│           ├── doctorsView.js     # Doctor roster, availability toggle, schedule viewer
│           ├── appointmentsView.js# Appointment booking, time validation, status updater
│           ├── medicalRecordsView.js # Clinical notes, vitals, Receptionist 403 denial card
│           ├── usersView.js       # User provisioning, role toggle, RBAC matrix table
│           ├── auditView.js       # Audit stream, event stats, JSON export
│           ├── backupView.js      # Snapshot catalog, SHA-256 verify, safe restore test
│           ├── cloudArchView.js   # Visual AWS architecture and 5 architectural pillars
│           ├── monitoringView.js  # Live telemetry, memory stats, CloudWatch alarm rules
│           └── evaluationView.js  # Live test runner, latency benchmark, AWS cost estimator
├── scripts/
│   ├── init-db.js                 # CLI database initializer & seeder
│   └── migrate-to-mysql.js        # SQLite-to-Amazon RDS MySQL migration generator
└── tests/
    └── api.test.js                # Automated test suite (30 tests across 9 test suites)
```

---

## 6. Local Setup Instructions

### Prerequisites
- **Node.js:** v18.x or higher (Tested and validated on Node.js v26.10.0).
- **npm:** v9.x or higher (Tested on npm 11.19.1).
- **Operating System:** macOS, Linux, or Windows.

### Installation Steps

1. **Clone or Navigate to the Repository:**
   ```bash
   cd "cloud computing"
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   ```bash
   cp .env.example .env
   ```
   *(The default `.env` configuration runs smoothly out-of-the-box with local SQLite).*

4. **Initialize Database & Seed Fictional Records:**
   ```bash
   npm run init-db
   ```

5. **Start the Application:**
   ```bash
   npm start
   ```

6. **Open in Browser:**
   Navigate to [http://localhost:3000](http://localhost:3000).

---

## 7. Fictional Development Credentials

The application provides a **1-Click Rapid Role Switcher** on the login page and topbar, but accounts can also be authenticated manually:

| Role | Fictional Account Name | Email Address | Password | Authorized Scope |
|---|---|---|---|---|
| **ADMIN** | Dr. Arthur Pendelton (Admin) | `admin@medicloud.local` | `AdminPassword123!` | Full governance, users, audit logs, backup & recovery, clinical audit view. |
| **DOCTOR** | Dr. Samantha Chen, MD (Cardiology) | `dr.chen@medicloud.local` | `DoctorPassword123!` | Authorized patient records, author clinical notes, assigned appointments roster. |
| **DOCTOR** | Dr. Rajesh Patel, MD (Neurology) | `dr.patel@medicloud.local` | `DoctorPassword123!` | Neurological clinical records, diagnostic notes, assigned appointment queue. |
| **RECEPTIONIST** | Maria Santos (Front Desk) | `receptionist@medicloud.local` | `ReceptionPassword123!` | Register patients, book appointments. **Strictly blocked from clinical records (403).** |

---

## 8. Automated Testing & Verification

The test suite executes 30 comprehensive tests across 9 suites covering authentication, session protection, role-based access control, medical record privilege separation, input validation, date constraints, cryptographic backups, and non-sensitive audit logging.

### Run Automated Tests
```bash
npm test
```

### Actual Test Execution Output
```
> medicloud-hospital-management@1.0.0 test
> node --test tests/**/*.test.js

▶ MediCloud Automated Security & Functional Test Suite
  ▶ System Health & Availability
    ✔ GET /api/health should return 200 OK with HEALTHY status and database connection
  ▶ Authentication & Session Protection
    ✔ POST /api/auth/login should fail (401) with incorrect credentials
    ✔ POST /api/auth/login should fail (400) when email or password is missing
    ✔ POST /api/auth/login should succeed for ADMIN and set HttpOnly session cookie
    ✔ POST /api/auth/login should succeed for DOCTOR
    ✔ POST /api/auth/login should succeed for RECEPTIONIST
    ✔ GET /api/auth/me should return 401 Unauthorized without session cookie
    ✔ GET /api/auth/me should return authenticated user profile when cookie is present
    ✔ POST /api/auth/logout should clear session and cookie
  ▶ Role-Based Access Control (RBAC) & Privilege Separation
    ✔ NEGATIVE TEST: Unauthenticated user accessing /api/patients receives 401
    ✔ NEGATIVE TEST: Doctor accessing /api/users receives 403 Forbidden
    ✔ NEGATIVE TEST: Receptionist accessing /api/users receives 403 Forbidden
    ✔ CRITICAL SECURITY REQUIREMENT: Receptionist accessing /api/medical-records receives 403 Forbidden
    ✔ CRITICAL SECURITY REQUIREMENT: Receptionist attempting to view patient medical history receives 403 Forbidden
    ✔ Authorized Doctor CAN view clinical medical records (200 OK)
    ✔ Authorized Admin CAN view user management list (200 OK, password_hash withheld)
  ▶ Patient Management & Validation
    ✔ Receptionist can register a new fictional patient
    ✔ Patient registration fails (400) if required fullName is missing
    ✔ Patient listing supports search query and pagination
  ▶ Appointment Scheduling & Validation
    ✔ Scheduling an appointment for a PAST date is rejected (400 Bad Request)
    ✔ Scheduling an appointment for an invalid patient ID is rejected (400)
    ✔ Scheduling a valid future appointment succeeds (201 Created)
  ▶ Clinical Medical Records Creation
    ✔ Authorized Doctor CAN add a clinical note to a patient record
    ✔ NEGATIVE TEST: Non-doctor (Receptionist) CANNOT add clinical note (403 Forbidden)
  ▶ Backup & Disaster Recovery Procedures
    ✔ NEGATIVE TEST: Doctor or Receptionist cannot trigger backups (403 Forbidden)
    ✔ Administrator can trigger cryptographic snapshot backup (201 Created)
    ✔ Administrator can verify backup cryptographic checksum
    ✔ GET /api/backup/specs returns disaster recovery comparison (RPO and RTO)
  ▶ Audit Logging Verification
    ✔ Admin can retrieve audit logs containing recorded actions (Zero passwords logged)
    ✔ NEGATIVE TEST: Receptionist cannot access audit logs (403 Forbidden)
✔ MediCloud Automated Security & Functional Test Suite
ℹ tests 30 | suites 9 | pass 30 | fail 0 | cancelled 0 | duration_ms ~1875ms
```

---

## 9. Database Schema & Migration to Amazon RDS for MySQL

### 9.1 Relational Schema Diagram (ERD)

```
+--------------------+           +----------------------+
|       USERS        | 1       * |       PATIENTS       |
+--------------------+-----------+----------------------+
| id (PK)            |           | id (PK)              |
| username (UQ)      |           | patient_code (UQ)    |
| email (UQ)         |           | full_name            |
| password_hash      |           | dob, gender          |
| role (ENUM)        |           | blood_group, phone   |
| status (ACTIVE)    |           | registered_by (FK)   |
+--------------------+           +----------------------+
         | 1                                | 1
         |                                  |
         | 1                                | *
+--------------------+           +----------------------+
|      DOCTORS       | 1       * |     APPOINTMENTS     |
+--------------------+-----------+----------------------+
| id (PK)            |           | id (PK)              |
| user_id (FK, UQ)   |           | appointment_code(UQ) |
| doctor_code (UQ)   |           | patient_id (FK)      |
| full_name          |           | doctor_id (FK)       |
| department         |           | appointment_date     |
| availability_status|           | appointment_time     |
+--------------------+           | status (SCHEDULED)   |
         | 1                     +----------------------+
         |                                  | 1
         | *                                | *
+--------------------+                      |
|  MEDICAL_RECORDS   |                      |
+--------------------+----------------------+
| id (PK)            |
| record_code (UQ)   |
| patient_id (FK)    |
| doctor_id (FK)     |
| diagnosis          |
| vital_signs (JSON) |
| clinical_notes     |
+--------------------+
```

### 9.2 SQLite to Amazon RDS for MySQL Migration Plan

The application is built with a modular database access layer (`src/db/index.js`), which decouples routes and controllers from the underlying SQL engine.

To migrate the active database state to **Amazon RDS for MySQL 8.0**:

1. **Execute the Migration Export Script:**
   ```bash
   npm run migrate:mysql
   ```
   This script parses all current SQLite records and generates `database/mysql_dump.sql` containing MySQL 8.0 InnoDB DDL and properly escaped `INSERT` statements.

2. **Create the Amazon RDS MySQL Database Instance:**
   - DB engine: MySQL 8.0.35.
   - DB instance class: `db.t3.medium`.
   - Multi-AZ Deployment: Enabled (creates standby replica in secondary AZ).
   - Storage: 50 GB gp3 with storage auto-scaling.
   - Master username: `admin`.
   - Initial database name: `medicloud_db`.
   - Encryption: AWS KMS default or custom key (`aws/rds`).

3. **Import Data to Amazon RDS Instance:**
   From a management bastion host within the VPC:
   ```bash
   mysql -h rds-mysql-cluster.c7xyz.us-east-1.rds.amazonaws.com -u admin -p medicloud_db < database/mysql_dump.sql
   ```

4. **Update Application Environment Variables:**
   Set `DATABASE_TYPE=mysql` and provide `RDS_DB_HOST`, `RDS_DB_PORT`, `RDS_DB_USER`, and `RDS_DB_PASSWORD` in the Elastic Beanstalk configuration.

---

## 10. Security Architecture & Threat Defense

### 10.1 Defense-in-Depth Layering
1. **Network Security:**
   - In production, EC2 application instances and Amazon RDS instances are deployed exclusively within **Private VPC Subnets**.
   - Public traffic reaches only the **Application Load Balancer** over HTTPS (Port 443).
   - Security groups enforce least-privilege traffic: The RDS security group permits inbound MySQL traffic (Port 3306) only from the Beanstalk Application Security Group.
2. **Access Control (RBAC):**
   - Server-side middleware verifies roles on every protected endpoint.
   - Front-desk receptionists are strictly isolated from clinical diagnosis notes.
3. **Cryptographic Protection:**
   - Passwords hashed with salted `bcryptjs` (cost factor: 12).
   - Session identifiers stored in `HttpOnly`, `SameSite=Lax` cookies, with `Secure` flags enforced in production.
4. **Data Sanitization & Injection Defense:**
   - Parameterized SQL queries ensure user input is never concatenated into raw SQL strings.
   - Audit logs defensive sanitization: Passwords, authorization tokens, and raw clinical notes are stripped prior to writing to the audit table.
5. **Rate Limiting:**
   - `express-rate-limit` enforces strict thresholds on login attempts (10 per 15 minutes) to protect against brute-force attacks.

---

## 11. Backup and Disaster Recovery Strategy

### 11.1 Quantitative Disaster Recovery Objectives

$$\text{RPO (Recovery Point Objective)} < 5 \text{ minutes}$$
$$\text{RTO (Recovery Time Objective)} < 15 \text{ minutes}$$

- **RPO Analysis:** With Amazon RDS for MySQL Multi-AZ, transaction logs (binlogs) are continuously uploaded to Amazon S3 every 5 minutes. If a catastrophic disaster occurs, point-in-time recovery (PITR) can restore transactions up to the last 5 minutes.
- **RTO Analysis:** If the primary RDS instance suffers hardware failure, Amazon RDS automatically initiates failover to the synchronous standby replica in the second Availability Zone. DNS switchover completes in **60 to 120 seconds**, well within the 15-minute RTO.

### 11.2 Local Snapshot Verification & Safeguard Restoration
- Administrators can trigger live snapshots via `POST /api/backup`.
- Every backup file is stored outside the web root (`data/backups/`) and its SHA-256 cryptographic checksum is recorded in the catalog.
- **Mandatory Pre-Restore Safeguard:** Prior to replacing the active database file, the system automatically writes a pre-restore safeguard copy. If checksum validation fails, restoration halts immediately.

---

## 12. AWS Deployment Procedure

### 12.1 AWS Elastic Beanstalk Deployment
1. **Prepare Deployment Bundle:**
   ```bash
   zip -r medicloud-deployment.zip . -x "node_modules/*" ".git/*" "database/*.sqlite" "data/backups/*"
   ```
2. **Create Elastic Beanstalk Application:**
   - Platform: Node.js (Node.js 20 running on 64-bit Amazon Linux 2023).
   - Environment type: Load-balanced, Auto-scaling (Min: 2, Max: 6).
3. **Configure Environment Variables in Beanstalk Console:**
   - `NODE_ENV`: `production`
   - `PORT`: `8080`
   - `SESSION_SECRET`: `<generated-cryptographic-secret>`
   - `RDS_DB_HOST`: `<rds-endpoint>`
   - `RDS_DB_USER`: `medicloud_app`
   - `RDS_DB_PASSWORD`: `<rds-password>`
4. **Deploy Application Bundle:**
   Upload `medicloud-deployment.zip` via the Elastic Beanstalk Console or AWS CLI (`eb deploy`).
5. **Configure HTTPS Listener on Application Load Balancer:**
   - Request a certificate in **AWS Certificate Manager (ACM)** for your hospital domain.
   - Attach the ACM certificate to Port 443 on the Application Load Balancer.

---

## 13. Compliance Assessment & Disclaimers

### 13.1 Healthcare Privacy Principles Assessment Matrix

| Principle ID | Principle Category | Implementation in Prototype | Proposed AWS Architecture Mapping |
|---|---|---|---|
| **ACC-01** | User Identification | Unique credentials, bcrypt salted hashing (12 rounds), session binding. | AWS IAM least-privilege policies, AWS Cognito / OIDC. |
| **ACC-02** | Role-Based Access Control | Strict deny-by-default middleware; Receptionist 403 clinical denial. | API Gateway Lambda Authorizer RBAC policies. |
| **AUD-01** | Audit Controls | Relational `audit_logs` table tracking actors, actions, timestamps, and status. | AWS CloudTrail & CloudWatch Logs with S3 Object Lock (WORM). |
| **INT-01** | Data Integrity | 100% Parameterized queries; SHA-256 checksum verification on backups. | AWS WAF SQLi managed rules; Amazon RDS automated data validation. |
| **ENC-01** | Transmission Security | Configured for TLS reverse proxy; HttpOnly, SameSite cookie attributes. | AWS Certificate Manager (ACM) TLS 1.3 on ALB. |
| **ENC-02** | Storage Encryption | Host-level filesystem encryption; private backup directory outside web root. | AWS KMS Customer-Managed Keys (CMK) for RDS and S3. |
| **BC-01** | Contingency Planning | Administrator-controlled snapshots with pre-restore safeguard. | Amazon RDS Multi-AZ automatic failover; 35-day automated snapshots + PITR. |

> [!CAUTION]
> **Legal Disclaimer:** This checklist reflects academic alignment with information security best practices. Passing prototype checks does **not** establish legal compliance with HIPAA, GDPR, or other statutory healthcare frameworks. Real clinical deployment requires institutional legal review, staff training, Business Associate Agreements (BAAs), and periodic third-party penetration testing.

---

## 14. Academic FT-III Viva Questions and Answers

### Q1: Why is Amazon RDS for MySQL preferable to self-hosting MySQL on an Amazon EC2 instance for a hospital management system?
**Answer:** Self-hosting MySQL on an EC2 instance places the burden of OS security patching, database minor version updates, manual replication setup, and storage management entirely on the engineering team. In a hospital system where high availability and data integrity are non-negotiable, **Amazon RDS for MySQL** provides:
1. **Automated Synchronous Multi-AZ Replication:** Writes are committed synchronously to a standby instance in an alternate Availability Zone. If the primary host fails, automatic failover completes in 60-120 seconds with zero data loss.
2. **Point-in-Time Recovery (PITR):** Transaction logs (binlogs) are continuously backed up to S3, permitting database restoration to any specific second within a 35-day retention window.
3. **Automated Security Patching:** Minor version upgrades and OS patches are scheduled during maintenance windows without requiring complex manual migration scripts.
4. **Automated Storage Auto-Scaling:** Amazon RDS dynamically expands storage volume without taking the database offline when disk capacity thresholds are reached.

---

### Q2: Explain the network architecture and security group design required to secure MediCloud in an Amazon VPC.
**Answer:** The architecture follows a multi-tier **VPC Subnet Design** across at least two Availability Zones (AZ-A and AZ-B):
1. **Public Subnets:** Contain only the **Application Load Balancer (ALB)** and NAT Gateways. Internet traffic enters solely through Port 443 (HTTPS).
2. **Private Application Subnets:** Contain the **AWS Elastic Beanstalk EC2 instances** running the Node.js Express application. These instances have no public IP addresses; outbound internet requests (e.g., pulling npm updates or external APIs) route through the NAT Gateway.
3. **Private Database Subnets:** Contain the **Amazon RDS Multi-AZ instances**. These subnets have no internet gateways or NAT routes.
4. **Security Group Least Privilege Rules:**
   - `ALB-SG`: Permits inbound 443 from `0.0.0.0/0`.
   - `App-SG` (EC2): Permits inbound 8080 only from source `ALB-SG`.
   - `DB-SG` (RDS): Permits inbound 3306 only from source `App-SG`.
   This ensures the database is physically and logically unreachable from the public internet.

---

### Q3: What is the difference between RPO and RTO in the context of MediCloud's disaster recovery plan?
**Answer:**
- **RPO (Recovery Point Objective):** The maximum tolerable amount of data loss measured in time between the last valid backup and a disaster event. For MediCloud, the target RPO is **< 5 minutes**. This is achieved because Amazon RDS streams binary transaction logs to Amazon S3 continuously, so the maximum uncommitted data loss is bounded by the log shipping interval.
- **RTO (Recovery Time Objective):** The maximum acceptable duration of infrastructure downtime before normal hospital operations are restored. For MediCloud, the target RTO is **< 15 minutes**. With RDS Multi-AZ, automatic hardware failover requires only 60 to 120 seconds. In the event of catastrophic data corruption requiring full snapshot restoration, provisioning a new RDS cluster from a snapshot takes approximately 10 to 14 minutes.

---

### Q4: How does MediCloud prevent Horizontal and Vertical Privilege Escalation?
**Answer:**
- **Vertical Privilege Escalation** occurs when a low-privileged user (e.g., Receptionist) attempts to perform administrative actions (e.g., creating users or viewing audit logs). MediCloud prevents this by enforcing **server-side deny-by-default RBAC middleware** (`requireAdmin`, `requireDoctor`). Even if an attacker modifies the client-side JavaScript or sends raw HTTP requests, the Express server intercepts the token/session and returns `403 Forbidden`.
- **Horizontal Privilege Escalation** occurs when a user accesses records belonging to a peer (e.g., viewing another user's private medical files by altering an ID parameter in `/api/patients/123`). MediCloud prevents this by:
  1. Validating that clinical notes can only be requested through authorized clinician endpoints.
  2. Scoping doctor queries so doctors can only review consultations and records for patients under their active clinical care.
  3. Auditing all parameter access in the `audit_logs` table to flag sequential ID enumeration (BOLA / IDOR attacks).

---

### Q5: How is encryption implemented across the data lifecycle in MediCloud?
**Answer:** MediCloud implements defense-in-depth cryptography across all three states of data:
1. **Data in Transit:**
   - Public client-to-ALB communication uses **TLS 1.3** managed via AWS Certificate Manager (ACM).
   - Internal ALB-to-EC2 and EC2-to-RDS communication uses encrypted TLS connections over private subnets.
2. **Data at Rest:**
   - In production, Amazon RDS storage, automated snapshots, and read replicas are encrypted using **AWS Key Management Service (AWS KMS)** with customer-managed keys (AES-256).
   - Document attachments uploaded to Amazon S3 use **Server-Side Encryption with KMS (SSE-KMS)** with S3 Block Public Access enabled.
   - In the local prototype, backups are stored in a private directory outside the web root with SHA-256 integrity checksums.
3. **Data in Use / Credential Storage:**
   - User passwords are never stored in plain text. They are hashed using **`bcryptjs`** with 12 salt rounds, protecting against dictionary and rainbow-table attacks.
   - Sensitive clinical diagnosis details and authentication secrets are strictly scrubbed from application logs and audit metadata.

---

### Q6: How does Amazon CloudWatch support reliability and proactive incident response in MediCloud?
**Answer:**
**Amazon CloudWatch** acts as the centralized telemetry and alarming hub:
1. **Metric Collection:** Tracks system metrics such as ALB `TargetResponseTime`, `HTTPCode_Target_5XX_Count`, RDS `CPUUtilization`, `DatabaseConnections`, and `FreeStorageSpace`.
2. **Centralized Log Groups:** Express logs are shipped to CloudWatch Logs via the CloudWatch unified agent. Filter patterns identify error spikes or repeated 401/403 authorization failures without logging patient PII.
3. **Proactive Alarms & Automation:**
   - If `HTTPCode_Target_5XX_Count` exceeds 5 within a 5-minute window, an alarm triggers an **Amazon SNS (Simple Notification Service)** topic that alerts on-call engineers.
   - If `TargetResponseTime` exceeds 1.5 seconds sustained over 10 minutes, an alarm triggers an **Auto Scaling Out policy** in Elastic Beanstalk to launch additional EC2 instances.
   - If RDS `FreeStorageSpace` drops below 10 GB, storage auto-scaling expands the allocated EBS volume automatically.

---

## 15. License

This project is licensed under the **MIT License**. Created as an educational case study for the **Cloud Computing FT-III Curriculum**.
