// ==============================================================================
// MediCloud Visual Cloud Architecture View
// Academic Cloud Computing Case Study — AWS Target Architecture
// ==============================================================================

const CloudArchView = {
  render(container) {
    container.innerHTML = `
      <!-- Academic Disclaimer Banner -->
      <div class="academic-notice-banner" style="margin-bottom: 24px;">
        <div class="icon">☁️</div>
        <div>
          <h4>Proposed AWS Enterprise Cloud Architecture</h4>
          <p>
            <strong>Educational Context:</strong> The architecture visualized below represents the target production design for AWS deployment. The current application is executing in an educational local Node.js & SQLite environment designed with modular abstractions to facilitate migration.
          </p>
        </div>
      </div>

      <!-- Interactive Architecture Visual Diagram -->
      <div class="arch-diagram-wrapper">
        <div class="arch-header">
          <div>
            <h3 style="color: #ffffff; font-size: 1.25rem;">MediCloud AWS Infrastructure Blueprint</h3>
            <span style="font-size: 0.8rem; color: #94a3b8;">Multi-AZ Virtual Private Cloud (VPC) Deployment</span>
          </div>
          <span class="arch-badge">Target Production: us-east-1</span>
        </div>

        <div class="arch-flow-grid">
          <!-- Tier 1: Ingress -->
          <div class="arch-node-card">
            <h4>🌐 Tier 1: Edge & Ingress</h4>
            <p>External traffic routed securely via Route 53 DNS and AWS CloudFront with WAF (Web Application Firewall) to block SQLi and DDoS.</p>
            <div class="arch-tag-row">
              <span class="arch-tag">Amazon Route 53</span>
              <span class="arch-tag">AWS WAF</span>
              <span class="arch-tag">TLS 1.3 HTTPS</span>
            </div>
          </div>

          <!-- Tier 2: Load Balancing -->
          <div class="arch-node-card">
            <h4>⚖️ Tier 2: Public Subnets</h4>
            <p>Application Load Balancer (ALB) distributed across 2 Availability Zones (AZ-A, AZ-B) terminating TLS and routing to private EC2 instances.</p>
            <div class="arch-tag-row">
              <span class="arch-tag">AWS ALB</span>
              <span class="arch-tag">Public Subnets</span>
              <span class="arch-tag">Health Check /api/health</span>
            </div>
          </div>

          <!-- Tier 3: Compute -->
          <div class="arch-node-card">
            <h4>🚀 Tier 3: Private Compute</h4>
            <p>AWS Elastic Beanstalk orchestrating Node.js Express containers inside private application subnets with Auto Scaling (2-6 instances).</p>
            <div class="arch-tag-row">
              <span class="arch-tag">AWS Elastic Beanstalk</span>
              <span class="arch-tag">Auto Scaling Group</span>
              <span class="arch-tag">Private Subnets</span>
            </div>
          </div>

          <!-- Tier 4: Managed Database -->
          <div class="arch-node-card">
            <h4>🗄️ Tier 4: Managed Database</h4>
            <p>Amazon RDS for MySQL 8.0 configured with Multi-AZ synchronous replication across dedicated private database subnets with automated backups.</p>
            <div class="arch-tag-row">
              <span class="arch-tag">Amazon RDS MySQL 8.0</span>
              <span class="arch-tag">Multi-AZ Failover</span>
              <span class="arch-tag">KMS Encryption (AES-256)</span>
            </div>
          </div>

          <!-- Tier 5: Document Storage -->
          <div class="arch-node-card">
            <h4>🪣 Tier 5: Encrypted Object Storage</h4>
            <p>Amazon S3 with S3 Block Public Access, SSE-KMS customer-managed keys, and private VPC Endpoints for patient document attachments.</p>
            <div class="arch-tag-row">
              <span class="arch-tag">Amazon S3</span>
              <span class="arch-tag">KMS Key CMK</span>
              <span class="arch-tag">VPC Gateway Endpoint</span>
            </div>
          </div>

          <!-- Tier 6: Observability -->
          <div class="arch-node-card">
            <h4>📊 Tier 6: Telemetry & Security</h4>
            <p>Centralized Amazon CloudWatch metrics, alarms, and log groups paired with AWS CloudTrail for immutable API event compliance.</p>
            <div class="arch-tag-row">
              <span class="arch-tag">Amazon CloudWatch</span>
              <span class="arch-tag">AWS CloudTrail</span>
              <span class="arch-tag">AWS IAM Roles</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Five Core Academic Pillar Cards -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 20px;">
        <!-- Pillar 1 -->
        <div class="card">
          <div class="card-header">
            <h3>1. Why a Managed Database (Amazon RDS)?</h3>
            <span class="badge badge-success">MANAGED SERVICE</span>
          </div>
          <p style="font-size: 0.85rem; color: var(--color-text-secondary); line-height: 1.6;">
            Self-hosting MySQL on EC2 introduces administrative overhead, patching downtime, and manual replication failover risks.
            <strong>Amazon RDS for MySQL</strong> provides:
            <br>• <strong>Synchronous Multi-AZ Replication:</strong> Guarantees high availability with automatic failover in 60-120 seconds without data loss.
            <br>• <strong>Automated Maintenance:</strong> Automated OS security patching and minor version updates during non-peak windows.
            <br>• <strong>Point-in-Time Recovery (PITR):</strong> Continuous transaction log streaming allows restoring database state to any second within 35 days.
          </p>
        </div>

        <!-- Pillar 2 -->
        <div class="card">
          <div class="card-header">
            <h3>2. Role-Based Access Control (RBAC)</h3>
            <span class="badge badge-info">SECURITY & PRIVILEGE</span>
          </div>
          <p style="font-size: 0.85rem; color: var(--color-text-secondary); line-height: 1.6;">
            Healthcare regulations mandate the <strong>Principle of Least Privilege</strong>. RBAC restricts data access strictly to job function requirements:
            <br>• <strong>Receptionists</strong> can register patients and schedule appointments, but are strictly prohibited (HTTP 403) from accessing clinical notes.
            <br>• <strong>Doctors</strong> can author and inspect clinical records, but cannot provision administrative users or trigger backups.
            <br>• <strong>Deny-by-Default:</strong> Every protected API endpoint verifies role authorization on the server side, preventing horizontal privilege escalation.
          </p>
        </div>

        <!-- Pillar 3 -->
        <div class="card">
          <div class="card-header">
            <h3>3. Defense-in-Depth Encryption</h3>
            <span class="badge badge-warning">CRYPTOGRAPHY</span>
          </div>
          <p style="font-size: 0.85rem; color: var(--color-text-secondary); line-height: 1.6;">
            Information security requires layered cryptographic protection across the lifecycle:
            <br>• <strong>Data in Transit:</strong> TLS 1.3 encryption on the Application Load Balancer and internal TLS connections between Beanstalk and RDS.
            <br>• <strong>Data at Rest:</strong> AWS KMS (Key Management Service) AES-256 envelope encryption applied to RDS storage volumes, automated snapshots, and S3 objects.
            <br>• <strong>Credential Hashing:</strong> User passwords hashed using salted bcrypt (12 rounds) with zero plain-text storage.
          </p>
        </div>

        <!-- Pillar 4 -->
        <div class="card">
          <div class="card-header">
            <h3>4. Backup, RPO & RTO Objectives</h3>
            <span class="badge badge-success">BUSINESS CONTINUITY</span>
          </div>
          <p style="font-size: 0.85rem; color: var(--color-text-secondary); line-height: 1.6;">
            Disaster recovery plans hinge on two quantitative metrics:
            <br>• <strong>Recovery Point Objective (RPO):</strong> Maximum acceptable data loss window. In MediCloud, RPO is <strong>&lt; 5 minutes</strong> via RDS binlog replication.
            <br>• <strong>Recovery Time Objective (RTO):</strong> Maximum acceptable downtime duration to restore service. In MediCloud, RTO is <strong>&lt; 15 minutes</strong> for automated Multi-AZ failover and snapshot restoration.
          </p>
        </div>

        <!-- Pillar 5 -->
        <div class="card" style="grid-column: 1 / -1;">
          <div class="card-header">
            <h3>5. Observability with Amazon CloudWatch & CloudTrail</h3>
            <span class="badge badge-neutral">MONITORING</span>
          </div>
          <p style="font-size: 0.85rem; color: var(--color-text-secondary); line-height: 1.6;">
            Reliability requires real-time telemetry and automated alerting:
            <br>• <strong>Metrics & Alarms:</strong> CloudWatch alarms monitor ALB <code>HTTPCode_Target_5XX_Count</code>, <code>TargetResponseTime &gt; 1.0s</code>, and RDS <code>CPUUtilization &gt; 80%</code>.
            <br>• <strong>Centralized Logs:</strong> Node.js application logs streamed to CloudWatch Logs with sanitized parameters (zero passwords or patient notes in logs).
            <br>• <strong>Audit Compliance:</strong> AWS CloudTrail captures AWS management events to provide an immutable trail for forensic investigations.
          </p>
        </div>
      </div>
    `;
  }
};
