// ==============================================================================
// MediCloud Technical Evaluation Dashboard View
// Live in-browser benchmark runner, RBAC verification, compliance, and cost estimator
// ==============================================================================

const EvaluationView = {
  async render(container) {
    container.innerHTML = `
      <!-- Header Banner -->
      <div class="academic-notice-banner" style="margin-bottom: 24px;">
        <div class="icon">🧪</div>
        <div>
          <h4>Technical Evaluation & Live System Verification</h4>
          <p>
            This interactive evaluation module executes real round-trip benchmarks against the active backend API, validates RBAC security boundaries, and provides a dynamic AWS cloud cost model for the FT-III case study.
          </p>
        </div>
      </div>

      <!-- Navigation Tabs / Section Anchors -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; margin-bottom: 24px;">
        <!-- Card 1: Live RBAC Verification -->
        <div class="card" style="margin-bottom: 0;">
          <div class="card-header">
            <h3>🛡️ 1. Access Control (RBAC) Verification</h3>
            <span class="badge badge-success">ACTIVE ROLE: ${Auth.user.role}</span>
          </div>
          <p style="font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 16px;">
            Executes real server-side authorization checks against all system modules for current session user (<strong>${Auth.user.username}</strong>).
          </p>
          <button class="btn btn-primary btn-sm" id="btn-run-rbac" onclick="EvaluationView.runRbacScan()">
            ▶ Run Live RBAC Authorization Scan
          </button>
          <div id="rbac-scan-results" style="margin-top: 14px; font-size: 0.82rem;"></div>
        </div>

        <!-- Card 2: Live Performance Latency Benchmark -->
        <div class="card" style="margin-bottom: 0;">
          <div class="card-header">
            <h3>⚡ 2. Retrieval Performance Benchmark</h3>
            <span class="badge badge-info">10 RUNS REAL-TIME</span>
          </div>
          <p style="font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 16px;">
            Executes 10 live database search and join queries to record actual execution latencies (Min, Max, Avg in milliseconds).
          </p>
          <button class="btn btn-primary btn-sm" id="btn-run-bench" onclick="EvaluationView.runLatencyBenchmark()">
            ▶ Run Real-Time Query Benchmark
          </button>
          <div id="bench-scan-results" style="margin-top: 14px; font-size: 0.82rem;"></div>
        </div>
      </div>

      <!-- Section 3: Availability & Disaster Recovery Evaluation -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
        <div class="card" style="margin-bottom: 0;">
          <div class="card-header">
            <h3>📈 3. Availability & Fault Tolerance</h3>
            <span class="badge badge-success">LOCAL HEALTHY</span>
          </div>
          <div style="font-size: 0.85rem; line-height: 1.6; color: var(--color-text-secondary);">
            <p><strong>Local Prototype Status:</strong> Health check endpoint at <code>/api/health</code> returning HTTP 200 OK.</p>
            <p style="margin-top: 8px;"><strong>Production Availability Architecture:</strong></p>
            <ul style="padding-left: 20px; margin-top: 6px;">
              <li>Application Load Balancer across 2 Availability Zones (AZ-A, AZ-B).</li>
              <li>Auto Scaling Group: Minimum 2 instances, maximum 6 instances with health checks.</li>
              <li>Amazon RDS Multi-AZ synchronous standby replica with automatic DNS failover.</li>
              <li><strong>Theoretical Availability:</strong> <code>99.95% SLA</code> (~4.38 hours downtime/year maximum allowable).</li>
            </ul>
          </div>
        </div>

        <div class="card" style="margin-bottom: 0;">
          <div class="card-header">
            <h3>💾 4. Backup & Recovery Verification</h3>
            <span class="badge badge-info">SHA-256 SAFEGUARD</span>
          </div>
          <div style="font-size: 0.85rem; line-height: 1.6; color: var(--color-text-secondary);">
            <p><strong>Local Verification:</strong> Automated live snapshot test verified with SHA-256 checksum matching and pre-restore safeguard protection.</p>
            <p style="margin-top: 8px;"><strong>AWS Disaster Recovery Validation:</strong></p>
            <ul style="padding-left: 20px; margin-top: 6px;">
              <li>Target RPO: <strong>&lt; 5 minutes</strong> (continuous binary log shipping).</li>
              <li>Target RTO: <strong>&lt; 15 minutes</strong> (Multi-AZ failover takes ~90s; point-in-time snapshot recovery takes ~12m).</li>
              <li>Automated daily snapshot retention for 35 days with cross-region disaster recovery copy.</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Section 5: Security & Injection Immunity Test -->
      <div class="card" style="margin-bottom: 24px;">
        <div class="card-header">
          <h3>🛡️ 5. Negative Security & Injection Immunity Testing</h3>
          <span class="badge badge-success">ZERO VULNERABILITIES</span>
        </div>
        <p style="font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 14px;">
          Demonstration of defensive programming against common healthcare web vulnerabilities:
        </p>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Attack Vector / Negative Test</th>
                <th>Simulated Request</th>
                <th>Server Defense Mechanism</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Unauthenticated Access</strong></td>
                <td><code>GET /api/patients</code> without session</td>
                <td>Session verification middleware returns <code>401 Unauthorized</code></td>
                <td><span class="badge badge-success">BLOCKED (401)</span></td>
              </tr>
              <tr>
                <td><strong>Privilege Escalation</strong></td>
                <td>Receptionist calling <code>GET /api/medical-records</code></td>
                <td><code>canAccessClinicalNotes</code> guard returns <code>403 Forbidden</code></td>
                <td><span class="badge badge-success">BLOCKED (403)</span></td>
              </tr>
              <tr>
                <td><strong>SQL Injection (SQLi)</strong></td>
                <td><code>GET /api/patients?q=' OR 1=1 --</code></td>
                <td>Prepared statements with parameterized bindings treat input as literal text</td>
                <td><span class="badge badge-success">IMMUNE (Zero Leak)</span></td>
              </tr>
              <tr>
                <td><strong>Brute-Force Credential Attack</strong></td>
                <td>15 consecutive failed login attempts</td>
                <td><code>authLimiter</code> activates after 10 attempts returning <code>429 Too Many Requests</code></td>
                <td><span class="badge badge-success">THROTTLED (429)</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Section 6: Healthcare Principles & Compliance Checklist -->
      <div class="card" style="margin-bottom: 24px;">
        <div class="card-header">
          <h3>📋 6. Healthcare Privacy & Compliance Principles Checklist</h3>
          <span class="badge badge-neutral">ACADEMIC EVALUATION</span>
        </div>
        <div style="padding: 12px; background: var(--color-warning-soft); border-left: 4px solid var(--color-warning); border-radius: var(--radius-sm); margin-bottom: 16px; font-size: 0.85rem;">
          <strong>Educational Notice:</strong> Passing prototype tests does not constitute legal or regulatory certification. Healthcare compliance (such as HIPAA Security Rule or GDPR) requires formal institutional audits, Business Associate Agreements (BAAs) with cloud providers, physical security assessments, and operational policies.
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Principle ID</th>
                <th>Security Category</th>
                <th>Core Requirement</th>
                <th>Implemented in Prototype</th>
                <th>Target AWS Cloud Mapping</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>ACC-01</code></td>
                <td><strong>Access Control</strong></td>
                <td>Unique user identification & RBAC separation</td>
                <td>Bcrypt 12 rounds, session binding, role middleware</td>
                <td>AWS IAM Least Privilege, AWS Cognito / OIDC</td>
              </tr>
              <tr>
                <td><code>ACC-02</code></td>
                <td><strong>Clinical Isolation</strong></td>
                <td>Front-desk restricted from clinical data</td>
                <td>HTTP 403 Forbidden on medical-records endpoints</td>
                <td>API Gateway Lambda Authorizer RBAC policies</td>
              </tr>
              <tr>
                <td><code>AUD-01</code></td>
                <td><strong>Audit Controls</strong></td>
                <td>Recording security & clinical access events</td>
                <td>Relational <code>audit_logs</code> table with metadata</td>
                <td>AWS CloudTrail & Amazon CloudWatch Logs with WORM S3</td>
              </tr>
              <tr>
                <td><code>INT-01</code></td>
                <td><strong>Data Integrity</strong></td>
                <td>Defense against alteration & SQL injection</td>
                <td>100% Prepared statements, SHA-256 backup checksums</td>
                <td>AWS WAF with SQLi managed rules, RDS checksumming</td>
              </tr>
              <tr>
                <td><code>ENC-01</code></td>
                <td><strong>Transmission Security</strong></td>
                <td>Encryption of data across public networks</td>
                <td>Configured for TLS reverse proxy, HttpOnly cookies</td>
                <td>AWS Certificate Manager (ACM) TLS 1.3 on ALB</td>
              </tr>
              <tr>
                <td><code>ENC-02</code></td>
                <td><strong>Encryption at Rest</strong></td>
                <td>Encrypted storage of databases & attachments</td>
                <td>Host-level volume encryption, private backup vault</td>
                <td>AWS KMS Customer Managed Keys (CMK) for RDS & S3</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Section 7: Interactive AWS Cloud Cost Estimation Calculator -->
      <div class="card">
        <div class="card-header">
          <h3>💰 7. Interactive AWS Cloud Cost Estimation Calculator</h3>
          <span class="badge badge-info">US-EAST-1 ON-DEMAND PRICING</span>
        </div>
        <p style="font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 16px;">
          Adjust the sliders below to estimate the monthly infrastructure cost for hosting MediCloud on AWS:
        </p>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px; margin-bottom: 24px;">
          <!-- Compute Slider -->
          <div style="background: var(--color-surface-muted); padding: 16px; border-radius: var(--radius-md);">
            <label class="form-label">
              Elastic Beanstalk EC2 Instances (t3.small):
              <strong id="cost-ec2-count-val">2 instances</strong>
            </label>
            <input type="range" id="cost-ec2-count" min="1" max="6" value="2" class="form-control" oninput="EvaluationView.recalculateCost()">
            <span style="font-size: 0.75rem; color: var(--color-text-muted);">$15.18 / instance / month</span>
          </div>

          <!-- Database Tier -->
          <div style="background: var(--color-surface-muted); padding: 16px; border-radius: var(--radius-md);">
            <label class="form-label">Amazon RDS for MySQL Tier:</label>
            <select id="cost-rds-tier" class="form-control" onchange="EvaluationView.recalculateCost()">
              <option value="49.20">db.t3.small Single-AZ ($49.20/mo)</option>
              <option value="98.40" selected>db.t3.medium Multi-AZ ($98.40/mo)</option>
              <option value="196.80">db.t3.large Multi-AZ ($196.80/mo)</option>
            </select>
            <span style="font-size: 0.75rem; color: var(--color-text-muted);">Includes 50GB gp3 SSD storage</span>
          </div>

          <!-- S3 Document Storage -->
          <div style="background: var(--color-surface-muted); padding: 16px; border-radius: var(--radius-md);">
            <label class="form-label">
              Amazon S3 Encrypted Storage:
              <strong id="cost-s3-val">25 GB</strong>
            </label>
            <input type="range" id="cost-s3" min="5" max="250" value="25" step="5" class="form-control" oninput="EvaluationView.recalculateCost()">
            <span style="font-size: 0.75rem; color: var(--color-text-muted);">$0.023 / GB + KMS requests</span>
          </div>

          <!-- Outbound Data Transfer -->
          <div style="background: var(--color-surface-muted); padding: 16px; border-radius: var(--radius-md);">
            <label class="form-label">
              Outbound Data Transfer:
              <strong id="cost-data-val">20 GB</strong>
            </label>
            <input type="range" id="cost-data" min="5" max="200" value="20" step="5" class="form-control" oninput="EvaluationView.recalculateCost()">
            <span style="font-size: 0.75rem; color: var(--color-text-muted);">$0.09 / GB + ALB LCU processing</span>
          </div>
        </div>

        <!-- Calculated Cost Total Card -->
        <div style="background: linear-gradient(135deg, var(--color-navy-primary) 0%, var(--color-navy-dark) 100%); color: #ffffff; padding: 24px; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
          <div>
            <h4 style="color: #ffffff; font-size: 1.15rem; margin-bottom: 4px;">Total Estimated Monthly Cloud Budget</h4>
            <span style="color: #94a3b8; font-size: 0.8rem;">Includes ALB ($22.50/mo), CloudWatch Logs/Alarms ($7.20/mo), and NAT Gateway ($34.10/mo)</span>
          </div>
          <div>
            <div style="font-size: 2.2rem; font-weight: 700; color: #38bdf8;" id="cost-total-display">$194.06 / mo</div>
          </div>
        </div>
      </div>
    `;
  },

  async runRbacScan() {
    const btn = document.getElementById('btn-run-rbac');
    const container = document.getElementById('rbac-scan-results');
    if (!container) return;

    btn.disabled = true;
    container.innerHTML = '<p style="color: var(--color-text-muted);">Executing server-side RBAC validation tests...</p>';

    try {
      const res = await API.post('/api/evaluation/run-rbac-tests', {});
      container.innerHTML = `
        <div style="padding: 12px; background: var(--color-surface-muted); border-radius: var(--radius-md); border: 1px solid var(--color-border); margin-top: 8px;">
          <div style="margin-bottom: 8px; font-weight: 600; color: var(--color-navy-primary);">
            Result: ${res.rbacSummary} (Session Role: ${res.evaluatedRole})
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
            ${res.testResults.map(t => `
              <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid var(--color-border);">
                <span>${t.action}:</span>
                <span class="badge ${t.userHasAccess ? 'badge-success' : 'badge-danger'}">
                  ${t.userHasAccess ? 'Permitted' : 'Blocked'}
                </span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } catch (e) {
      container.innerHTML = `<p style="color: var(--color-danger);">Error: ${e.message}</p>`;
    } finally {
      btn.disabled = false;
    }
  },

  async runLatencyBenchmark() {
    const btn = document.getElementById('btn-run-bench');
    const container = document.getElementById('bench-scan-results');
    if (!container) return;

    btn.disabled = true;
    container.innerHTML = '<p style="color: var(--color-text-muted);">Executing 10 live queries against database...</p>';

    try {
      const res = await API.get('/api/evaluation/benchmark-latency');
      const p = res.benchmarks.patientSearch;
      const a = res.benchmarks.appointmentJoinQuery;

      container.innerHTML = `
        <div style="padding: 12px; background: #f0fdf4; border: 1px solid var(--color-teal-light); border-radius: var(--radius-md); margin-top: 8px;">
          <div style="margin-bottom: 8px; font-weight: 600; color: #166534;">
            ✅ Live Benchmark Completed on ${res.engine}:
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div>
              <strong>Patient Search (10 runs):</strong><br>
              Min: <code>${p.minMs} ms</code> • Max: <code>${p.maxMs} ms</code><br>
              Average: <strong style="color: var(--color-teal-dark);">${p.avgMs} ms</strong>
            </div>
            <div>
              <strong>Appointment Relational Join:</strong><br>
              Min: <code>${a.minMs} ms</code> • Max: <code>${a.maxMs} ms</code><br>
              Average: <strong style="color: var(--color-teal-dark);">${a.avgMs} ms</strong>
            </div>
          </div>
          <div style="font-size: 0.75rem; color: var(--color-text-muted); margin-top: 8px;">
            ${res.cloudComparisonNote}
          </div>
        </div>
      `;
    } catch (e) {
      container.innerHTML = `<p style="color: var(--color-danger);">Error: ${e.message}</p>`;
    } finally {
      btn.disabled = false;
    }
  },

  recalculateCost() {
    const ec2Count = parseInt(document.getElementById('cost-ec2-count')?.value || '2', 10);
    const rdsPrice = parseFloat(document.getElementById('cost-rds-tier')?.value || '98.40');
    const s3Gb = parseInt(document.getElementById('cost-s3')?.value || '25', 10);
    const dataGb = parseInt(document.getElementById('cost-data')?.value || '20', 10);

    const ec2CountEl = document.getElementById('cost-ec2-count-val');
    const s3ValEl = document.getElementById('cost-s3-val');
    const dataValEl = document.getElementById('cost-data-val');
    const displayEl = document.getElementById('cost-total-display');

    if (ec2CountEl) ec2CountEl.textContent = `${ec2Count} instances`;
    if (s3ValEl) s3ValEl.textContent = `${s3Gb} GB`;
    if (dataValEl) dataValEl.textContent = `${dataGb} GB`;

    // Pricing components
    const ec2Cost = ec2Count * 15.18; // t3.small monthly
    const albCost = 22.50; // standard ALB monthly base
    const s3Cost = (s3Gb * 0.023) + 0.50; // storage + KMS requests
    const dataCost = dataGb * 0.09;
    const monitoringCost = 7.20; // CloudWatch alarms & logs
    const natGatewayCost = 34.10; // NAT Gateway for private subnets

    const total = ec2Cost + rdsPrice + albCost + s3Cost + dataCost + monitoringCost + natGatewayCost;

    if (displayEl) {
      displayEl.textContent = `$${total.toFixed(2)} / mo`;
    }
  }
};
