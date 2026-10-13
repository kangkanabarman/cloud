// ==============================================================================
// MediCloud Main Dashboard View
// ==============================================================================

const DashboardView = {
  async render(container) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <span style="font-size: 2rem;">⏳</span>
        <p style="margin-top: 10px; color: var(--color-text-muted);">Loading dashboard telemetry...</p>
      </div>
    `;

    try {
      // Parallel fetches for dashboard metrics
      const [patientsRes, doctorsRes, appointmentsRes, healthRes] = await Promise.all([
        API.get('/api/patients?limit=5'),
        API.get('/api/doctors'),
        API.get('/api/appointments'),
        API.get('/api/health')
      ]);

      const user = Auth.user;
      const todayStr = new Date().toISOString().split('T')[0];
      const todayAppointments = (appointmentsRes.appointments || []).filter(a => a.appointment_date === todayStr);
      const availableDocs = (doctorsRes.doctors || []).filter(d => d.availability_status === 'AVAILABLE');

      let quickActionsHtml = '';
      if (user.role === 'ADMIN') {
        quickActionsHtml = `
          <button class="btn btn-primary" onclick="PatientsView.openNewPatientModal()">➕ Register Patient</button>
          <button class="btn btn-secondary" onclick="AppointmentsView.openNewAppointmentModal()">📅 Schedule Appointment</button>
          <button class="btn btn-outline" onclick="UsersView.openNewUserModal()">🛡️ Add User</button>
          <button class="btn btn-outline" onclick="BackupView.triggerManualBackup()">💾 Create Snapshot Backup</button>
        `;
      } else if (user.role === 'RECEPTIONIST') {
        quickActionsHtml = `
          <button class="btn btn-primary" onclick="PatientsView.openNewPatientModal()">➕ Register Patient</button>
          <button class="btn btn-secondary" onclick="AppointmentsView.openNewAppointmentModal()">📅 Schedule Appointment</button>
          <button class="btn btn-outline" onclick="Router.navigate('patients')">👥 Search Patients</button>
        `;
      } else if (user.role === 'DOCTOR') {
        quickActionsHtml = `
          <button class="btn btn-primary" onclick="MedicalRecordsView.openNewRecordModal()">📋 Add Clinical Note</button>
          <button class="btn btn-secondary" onclick="Router.navigate('appointments')">📅 My Consultation Queue</button>
          <button class="btn btn-outline" onclick="Router.navigate('medical-records')">🩺 Review Patient Records</button>
        `;
      }

      container.innerHTML = `
        <!-- Academic Case Study Banner -->
        <div class="academic-notice-banner">
          <div class="icon">🎓</div>
          <div>
            <h4>Cloud Computing FT-III Case Study — Academic Prototype</h4>
            <p>
              This is an educational healthcare management prototype focusing on AWS cloud architecture, managed database resilience (Amazon RDS for MySQL target), role-based access control (RBAC), and verifiable disaster recovery.
              <strong>All patient names, medical histories, and identifiers are strictly fictional.</strong>
            </p>
          </div>
        </div>

        <!-- KPI Grid -->
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-icon blue">👥</div>
            <div class="kpi-details">
              <div class="kpi-title">Fictional Patients</div>
              <div class="kpi-value">${patientsRes.pagination ? patientsRes.pagination.total : 0}</div>
              <div class="kpi-subtext">Registered in database</div>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-icon teal">📅</div>
            <div class="kpi-details">
              <div class="kpi-title">Today's Appointments</div>
              <div class="kpi-value">${todayAppointments.length}</div>
              <div class="kpi-subtext">${appointmentsRes.appointments?.length || 0} total scheduled</div>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-icon green">🩺</div>
            <div class="kpi-details">
              <div class="kpi-title">Available Clinicians</div>
              <div class="kpi-value">${availableDocs.length} / ${(doctorsRes.doctors || []).length}</div>
              <div class="kpi-subtext">Active on consultation roster</div>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-icon amber">⚡</div>
            <div class="kpi-details">
              <div class="kpi-title">DB Query Latency</div>
              <div class="kpi-value">${healthRes.database?.queryLatencyMs || 0.4} ms</div>
              <div class="kpi-subtext">${healthRes.database?.engine || 'SQLite 3'}</div>
            </div>
          </div>
        </div>

        <!-- Quick Actions Card -->
        <div class="card" style="margin-bottom: 24px; padding: 18px 24px;">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
            <div>
              <h3 style="font-size: 1rem; color: var(--color-navy-primary);">
                👋 Welcome, ${user.fullName} (${user.role})
              </h3>
              <p style="font-size: 0.8rem; margin: 0;">Authorized operations based on your server-side session role.</p>
            </div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              ${quickActionsHtml}
            </div>
          </div>
        </div>

        <!-- Main Dashboard Split Layout -->
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px;">
          <!-- Left: Today's Appointments -->
          <div class="card">
            <div class="card-header">
              <h3>📅 Appointments Scheduled For Today (${todayStr})</h3>
              <a href="#appointments" class="btn btn-outline btn-sm">View All Queue</a>
            </div>
            ${todayAppointments.length === 0 ? `
              <p style="padding: 20px; text-align: center; color: var(--color-text-muted);">No appointments booked for today yet.</p>
            ` : `
              <div class="table-responsive">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Patient</th>
                      <th>Doctor</th>
                      <th>Department</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${todayAppointments.map(a => `
                      <tr>
                        <td><strong>${a.appointment_time}</strong></td>
                        <td>${a.patient_name} <br><span style="font-size: 0.75rem; color: var(--color-text-muted);">${a.patient_code}</span></td>
                        <td>${a.doctor_name}</td>
                        <td><span class="badge badge-info">${a.department}</span></td>
                        <td>
                          <span class="badge ${a.status === 'COMPLETED' ? 'badge-success' : a.status === 'IN_PROGRESS' ? 'badge-warning' : 'badge-neutral'}">
                            ${a.status}
                          </span>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `}
          </div>

          <!-- Right: Cloud Prototype Status Widget -->
          <div class="card">
            <div class="card-header">
              <h3>☁️ Cloud Telemetry</h3>
              <span class="badge badge-success">ACTIVE</span>
            </div>
            <div style="font-size: 0.85rem;">
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--color-border);">
                <span style="color: var(--color-text-muted);">Environment:</span>
                <strong>${healthRes.environment || 'development'}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--color-border);">
                <span style="color: var(--color-text-muted);">Server Uptime:</span>
                <strong>${healthRes.uptimeFormatted || '0s'}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--color-border);">
                <span style="color: var(--color-text-muted);">Heap Memory:</span>
                <strong>${healthRes.memory?.heapUsedMb || 0} MB / ${healthRes.memory?.heapTotalMb || 0} MB</strong>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--color-border);">
                <span style="color: var(--color-text-muted);">Total Requests:</span>
                <strong>${healthRes.performance?.totalRequests || 0}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--color-border);">
                <span style="color: var(--color-text-muted);">Avg Response:</span>
                <strong>${healthRes.performance?.avgResponseTimeMs || 0} ms</strong>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                <span style="color: var(--color-text-muted);">Target Hosting:</span>
                <span style="color: var(--color-blue-primary); font-weight: 600;">AWS Elastic Beanstalk</span>
              </div>
            </div>
            <div style="margin-top: 16px;">
              <a href="#cloud-arch" class="btn btn-outline btn-sm" style="width: 100%; text-align: center;">
                Inspect Proposed AWS Architecture ➜
              </a>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `
        <div class="card" style="text-align: center; color: var(--color-danger); padding: 40px;">
          <h3>Failed to load dashboard</h3>
          <p>${err.message}</p>
        </div>
      `;
    }
  }
};
