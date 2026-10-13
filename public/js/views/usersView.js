// ==============================================================================
// MediCloud User & Role Management View (Administrator Only)
// ==============================================================================

const UsersView = {
  async render(container) {
    if (Auth.user.role !== 'ADMIN') {
      container.innerHTML = `
        <div class="denied-card">
          <div class="denied-icon">🛡️</div>
          <h3>HTTP 403 Forbidden — Administrative Resource</h3>
          <p>
            User account provisioning and role assignments require <strong>ADMINISTRATOR</strong> authority.
            Your current authenticated session has role: <strong>${Auth.user.role}</strong>.
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
        <p style="margin-top: 10px; color: var(--color-text-muted);">Loading user and role directory...</p>
      </div>
    `;

    await this.loadUsers(container);
  },

  async loadUsers(container) {
    try {
      const res = await API.get('/api/users');
      const users = res.users || [];

      container.innerHTML = `
        <!-- Top Action Card -->
        <div class="card" style="margin-bottom: 20px; padding: 18px 24px;">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
            <div>
              <h3 style="font-size: 1.05rem; color: var(--color-navy-primary);">
                🛡️ System User & Identity Governance
              </h3>
              <p style="font-size: 0.8rem; margin: 0; color: var(--color-text-muted);">
                Server-side role assignments with salted bcrypt credentials (salt rounds: 12).
              </p>
            </div>
            <div>
              <button class="btn btn-primary" onclick="UsersView.openNewUserModal()">
                ➕ Provision New Staff User
              </button>
            </div>
          </div>
        </div>

        <!-- Users Table -->
        <div class="card" style="padding: 0; overflow: hidden; margin-bottom: 24px;">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>System Role</th>
                  <th>Status</th>
                  <th>Last Active</th>
                  <th style="text-align: right;">Governance Actions</th>
                </tr>
              </thead>
              <tbody>
                ${users.map(u => {
                  const isSelf = u.id === Auth.user.id;
                  return `
                    <tr>
                      <td><strong>${u.username}</strong> ${isSelf ? '<span class="badge badge-info">YOU</span>' : ''}</td>
                      <td>${u.full_name}</td>
                      <td>${u.email}</td>
                      <td>
                        <span class="user-role-badge role-${u.role.toLowerCase()}">
                          ${u.role}
                        </span>
                      </td>
                      <td>
                        <span class="badge ${u.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}">
                          ${u.status}
                        </span>
                      </td>
                      <td>${u.last_login_at || 'Never'}</td>
                      <td style="text-align: right;">
                        ${!isSelf ? `
                          <button
                            class="btn btn-outline btn-sm"
                            onclick="UsersView.toggleStatus(${u.id}, '${u.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'}')"
                          >
                            ${u.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                          </button>
                          <select
                            class="form-control"
                            style="width: auto; display: inline-block; padding: 4px 8px; font-size: 0.75rem;"
                            onchange="UsersView.changeRole(${u.id}, this.value)"
                          >
                            <option value="ADMIN" ${u.role === 'ADMIN' ? 'selected' : ''}>ADMIN</option>
                            <option value="DOCTOR" ${u.role === 'DOCTOR' ? 'selected' : ''}>DOCTOR</option>
                            <option value="RECEPTIONIST" ${u.role === 'RECEPTIONIST' ? 'selected' : ''}>RECEPTIONIST</option>
                          </select>
                        ` : `
                          <span style="font-size: 0.75rem; color: var(--color-text-muted);">Active Administrator</span>
                        `}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Visual RBAC Matrix Table -->
        <div class="card">
          <div class="card-header">
            <h3>🔐 Role-Based Access Control (RBAC) Privilege Matrix</h3>
            <span class="badge badge-success">DENY-BY-DEFAULT ENFORCED</span>
          </div>
          <p style="font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 16px;">
            The table below reflects the architectural authorization policies hardcoded into server-side Express middleware:
          </p>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>System Resource / Operation</th>
                  <th>ADMINISTRATOR</th>
                  <th>DOCTOR</th>
                  <th>RECEPTIONIST</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Register Fictional Patient</td>
                  <td><span class="badge badge-success">Allowed</span></td>
                  <td><span class="badge badge-danger">Denied (403)</span></td>
                  <td><span class="badge badge-success">Allowed</span></td>
                </tr>
                <tr>
                  <td>Edit Patient Demographics</td>
                  <td><span class="badge badge-success">Allowed</span></td>
                  <td><span class="badge badge-danger">Denied (403)</span></td>
                  <td><span class="badge badge-success">Allowed</span></td>
                </tr>
                <tr>
                  <td>Schedule Appointments</td>
                  <td><span class="badge badge-success">Allowed</span></td>
                  <td><span class="badge badge-danger">Denied (403)</span></td>
                  <td><span class="badge badge-success">Allowed</span></td>
                </tr>
                <tr>
                  <td>View Clinical Medical Notes</td>
                  <td><span class="badge badge-info">Audit Mode</span></td>
                  <td><span class="badge badge-success">Allowed</span></td>
                  <td><span class="badge badge-danger">STRICTLY BLOCKED (403)</span></td>
                </tr>
                <tr>
                  <td>Write Clinical Note & Diagnosis</td>
                  <td><span class="badge badge-danger">Denied</span></td>
                  <td><span class="badge badge-success">Allowed</span></td>
                  <td><span class="badge badge-danger">STRICTLY BLOCKED (403)</span></td>
                </tr>
                <tr>
                  <td>Manage User Accounts & Roles</td>
                  <td><span class="badge badge-success">Allowed</span></td>
                  <td><span class="badge badge-danger">Denied (403)</span></td>
                  <td><span class="badge badge-danger">Denied (403)</span></td>
                </tr>
                <tr>
                  <td>Inspect Security Audit Logs</td>
                  <td><span class="badge badge-success">Allowed</span></td>
                  <td><span class="badge badge-danger">Denied (403)</span></td>
                  <td><span class="badge badge-danger">Denied (403)</span></td>
                </tr>
                <tr>
                  <td>Trigger Database Backup & Restore</td>
                  <td><span class="badge badge-success">Allowed</span></td>
                  <td><span class="badge badge-danger">Denied (403)</span></td>
                  <td><span class="badge badge-danger">Denied (403)</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `
        <div class="card" style="text-align: center; color: var(--color-danger); padding: 40px;">
          <h3>Error loading users</h3>
          <p>${err.message}</p>
        </div>
      `;
    }
  },

  async toggleStatus(userId, newStatus) {
    try {
      await API.put(`/api/users/${userId}/status`, { status: newStatus });
      showToast(`User status updated to ${newStatus}`, 'success');
      this.loadUsers(document.getElementById('app-content'));
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  async changeRole(userId, newRole) {
    try {
      await API.put(`/api/users/${userId}/role`, { role: newRole });
      showToast(`User role updated to ${newRole}`, 'success');
      this.loadUsers(document.getElementById('app-content'));
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  openNewUserModal() {
    openGenericModal(
      'Provision New Staff Account (Administrator)',
      `
        <form id="new-user-form">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Username *</label>
              <input type="text" id="nu-username" class="form-control" required placeholder="e.g. dr_adams">
            </div>
            <div class="form-group">
              <label class="form-label">Full Name *</label>
              <input type="text" id="nu-name" class="form-control" required placeholder="e.g. Dr. John Adams, MD">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Email Address *</label>
            <input type="email" id="nu-email" class="form-control" required placeholder="adams@medicloud.local">
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">System Role *</label>
              <select id="nu-role" class="form-control" required>
                <option value="RECEPTIONIST">RECEPTIONIST (Front Desk)</option>
                <option value="DOCTOR">DOCTOR (Clinical Staff)</option>
                <option value="ADMIN">ADMIN (System Administrator)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Password (Min 8 chars) *</label>
              <input type="password" id="nu-password" class="form-control" required placeholder="••••••••">
            </div>
          </div>

          <div id="doctor-fields-preview" style="display: none; padding: 12px; background: var(--color-surface-muted); border-radius: var(--radius-md); margin-top: 10px;">
            <div class="form-group">
              <label class="form-label">Clinical Department</label>
              <select id="nu-dept" class="form-control">
                <option value="Cardiology">Cardiology</option>
                <option value="Neurology">Neurology</option>
                <option value="Pediatrics">Pediatrics</option>
                <option value="Orthopedics">Orthopedics</option>
                <option value="General Medicine">General Medicine</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Specialization</label>
              <input type="text" id="nu-spec" class="form-control" placeholder="Clinical Subspecialty">
            </div>
          </div>
        </form>
      `,
      `
        <button class="btn btn-outline" onclick="closeGenericModal()">Cancel</button>
        <button class="btn btn-primary" onclick="UsersView.submitNewUser()">Create User Account</button>
      `
    );

    // Toggle doctor fields when role is DOCTOR
    const roleSelect = document.getElementById('nu-role');
    const doctorFields = document.getElementById('doctor-fields-preview');
    if (roleSelect && doctorFields) {
      roleSelect.addEventListener('change', () => {
        doctorFields.style.display = roleSelect.value === 'DOCTOR' ? 'block' : 'none';
      });
    }
  },

  async submitNewUser() {
    const payload = {
      username: document.getElementById('nu-username')?.value,
      fullName: document.getElementById('nu-name')?.value,
      email: document.getElementById('nu-email')?.value,
      role: document.getElementById('nu-role')?.value,
      password: document.getElementById('nu-password')?.value,
      department: document.getElementById('nu-dept')?.value,
      specialization: document.getElementById('nu-spec')?.value
    };

    if (!payload.username || !payload.fullName || !payload.email || !payload.password || !payload.role) {
      showToast('Please fill in all required user fields.', 'warning');
      return;
    }

    try {
      const res = await API.post('/api/users', payload);
      closeGenericModal();
      showToast(`User ${res.user.username} provisioned successfully!`, 'success');
      this.loadUsers(document.getElementById('app-content'));
    } catch (e) {
      showToast(e.message, 'error');
    }
  }
};
