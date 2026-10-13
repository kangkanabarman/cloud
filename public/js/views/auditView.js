// ==============================================================================
// MediCloud Audit Logs & Security Trails View (Administrator Only)
// ==============================================================================

const AuditView = {
  currentPage: 1,
  eventTypeFilter: '',
  statusFilter: '',
  searchQuery: '',

  async render(container) {
    if (Auth.user.role !== 'ADMIN') {
      container.innerHTML = `
        <div class="denied-card">
          <div class="denied-icon">📜</div>
          <h3>HTTP 403 Forbidden — Audit Trail Protected</h3>
          <p>
            Security audit log inspection is restricted to <strong>ADMINISTRATOR</strong> and compliance auditors.
            Your current session role: <strong>${Auth.user.role}</strong>.
          </p>
          <button class="btn btn-primary" onclick="openRoleModal()">
            Switch to Administrator Account
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <span style="font-size: 2rem;">⏳</span>
        <p style="margin-top: 10px; color: var(--color-text-muted);">Loading immutable audit log stream...</p>
      </div>
    `;

    await this.loadAuditLogs(container);
  },

  async loadAuditLogs(container) {
    try {
      const queryParams = new URLSearchParams({
        page: this.currentPage,
        limit: 15,
        eventType: this.eventTypeFilter,
        status: this.statusFilter,
        search: this.searchQuery
      });

      const [res, statsRes] = await Promise.all([
        API.get(`/api/audit-logs?${queryParams.toString()}`),
        API.get('/api/audit-logs/stats')
      ]);

      const logs = res.data || [];
      const pagination = res.pagination || { total: 0, page: 1, totalPages: 1 };

      container.innerHTML = `
        <!-- Audit Stats Grid -->
        <div class="kpi-grid" style="margin-bottom: 20px;">
          <div class="kpi-card">
            <div class="kpi-icon blue">📜</div>
            <div class="kpi-details">
              <div class="kpi-title">Total Audit Records</div>
              <div class="kpi-value">${statsRes.totalAuditRecords || 0}</div>
              <div class="kpi-subtext">Recorded in relational audit store</div>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-icon red">🛑</div>
            <div class="kpi-details">
              <div class="kpi-title">Blocked Interceptions</div>
              <div class="kpi-value">${statsRes.blockedAttempts || 0}</div>
              <div class="kpi-subtext">Unauthorized 403 access events</div>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-icon amber">⚠️</div>
            <div class="kpi-details">
              <div class="kpi-title">Failed Logins</div>
              <div class="kpi-value">${statsRes.failedLogins || 0}</div>
              <div class="kpi-subtext">Rate-limited authentication attempts</div>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-icon teal">🩺</div>
            <div class="kpi-details">
              <div class="kpi-title">Clinical Record Queries</div>
              <div class="kpi-value">${statsRes.clinicalRecordAccesses || 0}</div>
              <div class="kpi-subtext">Protected clinical views logged</div>
            </div>
          </div>
        </div>

        <!-- Filter & Export Card -->
        <div class="card" style="margin-bottom: 20px; padding: 18px 24px;">
          <div class="filter-bar" style="margin-bottom: 0;">
            <div class="search-input-wrap">
              <span class="search-icon">🔍</span>
              <input
                type="text"
                id="audit-search-input"
                class="form-control"
                placeholder="Search action or target resource..."
                value="${this.searchQuery}"
              >
            </div>

            <div class="filter-actions">
              <select id="audit-status-select" class="form-control" style="width: auto;">
                <option value="">All Statuses</option>
                <option value="SUCCESS" ${this.statusFilter === 'SUCCESS' ? 'selected' : ''}>Success</option>
                <option value="BLOCKED" ${this.statusFilter === 'BLOCKED' ? 'selected' : ''}>Blocked (403)</option>
                <option value="FAILURE" ${this.statusFilter === 'FAILURE' ? 'selected' : ''}>Failure</option>
              </select>

              <select id="audit-event-select" class="form-control" style="width: auto;">
                <option value="">All Event Types</option>
                <option value="AUTH_LOGIN_SUCCESS" ${this.eventTypeFilter === 'AUTH_LOGIN_SUCCESS' ? 'selected' : ''}>AUTH_LOGIN_SUCCESS</option>
                <option value="AUTH_LOGIN_FAILED" ${this.eventTypeFilter === 'AUTH_LOGIN_FAILED' ? 'selected' : ''}>AUTH_LOGIN_FAILED</option>
                <option value="UNAUTHORIZED_ACCESS_ATTEMPT" ${this.eventTypeFilter === 'UNAUTHORIZED_ACCESS_ATTEMPT' ? 'selected' : ''}>UNAUTHORIZED_ACCESS_ATTEMPT</option>
                <option value="RECEPTIONIST_CLINICAL_ACCESS_BLOCKED" ${this.eventTypeFilter === 'RECEPTIONIST_CLINICAL_ACCESS_BLOCKED' ? 'selected' : ''}>RECEPTIONIST_CLINICAL_ACCESS_BLOCKED</option>
                <option value="PATIENT_REGISTER_PATIENT" ${this.eventTypeFilter === 'PATIENT_REGISTER_PATIENT' ? 'selected' : ''}>PATIENT_REGISTER_PATIENT</option>
                <option value="MEDICAL_RECORD_CREATE_CLINICAL_NOTE" ${this.eventTypeFilter === 'MEDICAL_RECORD_CREATE_CLINICAL_NOTE' ? 'selected' : ''}>MEDICAL_RECORD_CREATE_CLINICAL_NOTE</option>
                <option value="BACKUP_CREATED" ${this.eventTypeFilter === 'BACKUP_CREATED' ? 'selected' : ''}>BACKUP_CREATED</option>
              </select>

              <a href="/api/audit-logs/export" class="btn btn-outline" download>
                📥 Export JSON
              </a>
            </div>
          </div>
        </div>

        <!-- Audit Table -->
        <div class="card" style="padding: 0; overflow: hidden; margin-bottom: 24px;">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Event Type</th>
                  <th>Actor (Role)</th>
                  <th>Target Resource</th>
                  <th>Action</th>
                  <th>Status</th>
                  <th>Client IP</th>
                  <th style="text-align: right;">Metadata</th>
                </tr>
              </thead>
              <tbody>
                ${logs.length === 0 ? `
                  <tr>
                    <td colspan="8" style="text-align: center; padding: 36px; color: var(--color-text-muted);">
                      No audit log entries matching filters.
                    </td>
                  </tr>
                ` : logs.map(l => `
                  <tr>
                    <td style="white-space: nowrap; font-size: 0.78rem; color: var(--color-text-secondary);">
                      ${l.created_at}
                    </td>
                    <td>
                      <span class="badge ${
                        l.status === 'BLOCKED' ? 'badge-danger' :
                        l.event_type.startsWith('AUTH') ? 'badge-info' : 'badge-neutral'
                      }">
                        ${l.event_type}
                      </span>
                    </td>
                    <td>
                      <strong>${l.actor_username || 'anonymous'}</strong><br>
                      <span class="user-role-badge role-${(l.actor_role || 'guest').toLowerCase()}">
                        ${l.actor_role || 'NONE'}
                      </span>
                    </td>
                    <td>
                      <span style="font-weight: 500;">${l.target_resource}</span>
                      ${l.target_id ? `<br><span style="font-size: 0.72rem; color: var(--color-text-muted);">${l.target_id}</span>` : ''}
                    </td>
                    <td><code>${l.action}</code></td>
                    <td>
                      <span class="badge ${
                        l.status === 'SUCCESS' ? 'badge-success' :
                        l.status === 'BLOCKED' ? 'badge-danger' : 'badge-warning'
                      }">
                        ${l.status}
                      </span>
                    </td>
                    <td style="font-size: 0.78rem; color: var(--color-text-muted);">${l.ip_address}</td>
                    <td style="text-align: right;">
                      <button class="btn btn-outline btn-sm" onclick="AuditView.inspectMetadata(${l.id})">
                        Inspect
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- Pagination Footer -->
          <div class="pagination-wrap">
            <div>
              Showing <strong>${logs.length}</strong> of <strong>${pagination.total}</strong> audit entries
            </div>
            <div class="pagination-buttons">
              <button
                class="btn btn-outline btn-sm"
                ${pagination.page <= 1 ? 'disabled' : ''}
                onclick="AuditView.changePage(${pagination.page - 1})"
              >
                ◀ Previous
              </button>
              <span style="align-self: center; padding: 0 8px; font-weight: 600;">
                Page ${pagination.page} / ${pagination.totalPages || 1}
              </span>
              <button
                class="btn btn-outline btn-sm"
                ${pagination.page >= pagination.totalPages ? 'disabled' : ''}
                onclick="AuditView.changePage(${pagination.page + 1})"
              >
                Next ▶
              </button>
            </div>
          </div>
        </div>

        <!-- Cloud Architecture Deep Dive Note -->
        <div class="card" style="background: #f8fafc; border: 1px dashed var(--color-border-subtle);">
          <h4 style="font-size: 0.95rem; color: var(--color-navy-primary); margin-bottom: 8px;">
            ☁️ AWS Production Audit Trail Blueprint
          </h4>
          <p style="font-size: 0.82rem; color: var(--color-text-secondary); line-height: 1.5;">
            In local development, audit records are committed to the SQLite <code>audit_logs</code> table. In a target production AWS deployment, security logs must be made tamper-proof and immutable by:
            <strong>1.</strong> Streaming application audit events directly to <strong>Amazon CloudWatch Logs</strong> with a dedicated subscription filter.<br>
            <strong>2.</strong> Enabling <strong>AWS CloudTrail</strong> with multi-region event logging to track all administrative AWS API operations.<br>
            <strong>3.</strong> Archiving logs to an <strong>Amazon S3 Bucket</strong> configured with <strong>Object Lock (WORM - Write Once, Read Many)</strong> and S3 Glacier Vault Lock to satisfy strict healthcare non-repudiation mandates.
          </p>
        </div>
      `;

      // Filter events
      const searchInput = document.getElementById('audit-search-input');
      const statusSelect = document.getElementById('audit-status-select');
      const eventSelect = document.getElementById('audit-event-select');

      if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', e => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            this.searchQuery = e.target.value.trim();
            this.currentPage = 1;
            this.loadAuditLogs(container);
          }, 350);
        });
      }

      if (statusSelect) {
        statusSelect.addEventListener('change', e => {
          this.statusFilter = e.target.value;
          this.currentPage = 1;
          this.loadAuditLogs(container);
        });
      }

      if (eventSelect) {
        eventSelect.addEventListener('change', e => {
          this.eventTypeFilter = e.target.value;
          this.currentPage = 1;
          this.loadAuditLogs(container);
        });
      }
    } catch (err) {
      container.innerHTML = `
        <div class="card" style="text-align: center; color: var(--color-danger); padding: 40px;">
          <h3>Error loading audit logs</h3>
          <p>${err.message}</p>
        </div>
      `;
    }
  },

  changePage(newPage) {
    this.currentPage = newPage;
    this.loadAuditLogs(document.getElementById('app-content'));
  },

  async inspectMetadata(logId) {
    try {
      const res = await API.get('/api/audit-logs?limit=50');
      const log = (res.data || []).find(l => l.id === logId);
      if (!log) throw new Error('Log entry not found');

      openGenericModal(
        `Audit Event Metadata — #${log.id}`,
        `
          <div style="font-size: 0.88rem;">
            <div style="margin-bottom: 12px;">
              <strong>Event Type:</strong> <span class="badge badge-info">${log.event_type}</span><br>
              <strong>Timestamp:</strong> ${log.created_at}<br>
              <strong>Status:</strong> ${log.status}
            </div>
            <div style="margin-bottom: 12px;">
              <strong>Actor:</strong> ${log.actor_username} (${log.actor_role})<br>
              <strong>Target:</strong> ${log.target_resource} (${log.target_id || 'N/A'})<br>
              <strong>Action:</strong> <code>${log.action}</code>
            </div>
            <div style="margin-bottom: 12px;">
              <strong>Client IP & User-Agent:</strong><br>
              <code style="font-size: 0.75rem; word-break: break-all;">${log.ip_address} — ${log.user_agent}</code>
            </div>
            <div style="margin-top: 12px;">
              <strong>Sanitized JSON Payload:</strong>
              <pre style="background: #0f172a; color: #38bdf8; padding: 12px; border-radius: var(--radius-sm); font-size: 0.78rem; overflow-x: auto; margin-top: 6px;">${JSON.stringify(log.metadata || {}, null, 2)}</pre>
            </div>
          </div>
        `,
        `
          <button class="btn btn-outline" onclick="closeGenericModal()">Close</button>
        `
      );
    } catch (e) {
      showToast(e.message, 'error');
    }
  }
};
