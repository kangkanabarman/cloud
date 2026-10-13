// ==============================================================================
// MediCloud Patient Management View
// ==============================================================================

const PatientsView = {
  currentPage: 1,
  searchQuery: '',
  statusFilter: '',

  async render(container) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <span style="font-size: 2rem;">⏳</span>
        <p style="margin-top: 10px; color: var(--color-text-muted);">Loading patient directory...</p>
      </div>
    `;

    await this.loadPatients(container);
  },

  async loadPatients(container) {
    try {
      const queryParams = new URLSearchParams({
        page: this.currentPage,
        limit: 10,
        q: this.searchQuery,
        status: this.statusFilter
      });

      const res = await API.get(`/api/patients?${queryParams.toString()}`);
      const patients = res.data || [];
      const pagination = res.pagination || { total: 0, page: 1, totalPages: 1 };
      const canRegister = ['ADMIN', 'RECEPTIONIST'].includes(Auth.user.role);

      container.innerHTML = `
        <!-- Filter & Action Header -->
        <div class="card" style="margin-bottom: 20px; padding: 18px 24px;">
          <div class="filter-bar" style="margin-bottom: 0;">
            <div class="search-input-wrap">
              <span class="search-icon">🔍</span>
              <input
                type="text"
                id="patient-search-input"
                class="form-control"
                placeholder="Search by fictional Name or Patient Code..."
                value="${this.searchQuery}"
              >
            </div>

            <div class="filter-actions">
              <select id="patient-status-select" class="form-control" style="width: auto;">
                <option value="" ${this.statusFilter === '' ? 'selected' : ''}>All Statuses</option>
                <option value="ACTIVE" ${this.statusFilter === 'ACTIVE' ? 'selected' : ''}>Active</option>
                <option value="INPATIENT" ${this.statusFilter === 'INPATIENT' ? 'selected' : ''}>Inpatient</option>
                <option value="DISCHARGED" ${this.statusFilter === 'DISCHARGED' ? 'selected' : ''}>Discharged</option>
              </select>

              ${canRegister ? `
                <button class="btn btn-primary" onclick="PatientsView.openNewPatientModal()">
                  ➕ Register Patient
                </button>
              ` : `
                <button class="btn btn-outline" disabled title="Clinical doctors do not register patients (RBAC separation)">
                  🔒 Front Desk Registration Only
                </button>
              `}
            </div>
          </div>
        </div>

        <!-- Patients Data Table -->
        <div class="card" style="padding: 0; overflow: hidden;">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Patient Code</th>
                  <th>Full Name (Fictional)</th>
                  <th>DOB</th>
                  <th>Gender</th>
                  <th>Blood Group</th>
                  <th>Contact Phone</th>
                  <th>Status</th>
                  <th style="text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${patients.length === 0 ? `
                  <tr>
                    <td colspan="8" style="text-align: center; padding: 36px; color: var(--color-text-muted);">
                      No fictional patient records found matching query.
                    </td>
                  </tr>
                ` : patients.map(p => `
                  <tr>
                    <td><strong>${p.patient_code}</strong></td>
                    <td>${p.full_name}</td>
                    <td>${p.dob}</td>
                    <td><span class="badge badge-neutral">${p.gender}</span></td>
                    <td><strong>${p.blood_group || 'N/A'}</strong></td>
                    <td>${p.phone}</td>
                    <td>
                      <span class="badge ${p.status === 'ACTIVE' ? 'badge-success' : p.status === 'INPATIENT' ? 'badge-warning' : 'badge-neutral'}">
                        ${p.status}
                      </span>
                    </td>
                    <td style="text-align: right;">
                      <button class="btn btn-outline btn-sm" onclick="PatientsView.viewDetails(${p.id})">Details</button>
                      ${canRegister ? `
                        <button class="btn btn-outline btn-sm" onclick="PatientsView.openEditModal(${p.id})">Edit</button>
                      ` : ''}
                      ${Auth.user.role === 'DOCTOR' ? `
                        <button class="btn btn-primary btn-sm" onclick="MedicalRecordsView.viewPatientHistory(${p.id})">Clinical History</button>
                      ` : ''}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- Pagination Footer -->
          <div class="pagination-wrap">
            <div>
              Showing <strong>${patients.length}</strong> of <strong>${pagination.total}</strong> fictional patient records
            </div>
            <div class="pagination-buttons">
              <button
                class="btn btn-outline btn-sm"
                ${pagination.page <= 1 ? 'disabled' : ''}
                onclick="PatientsView.changePage(${pagination.page - 1})"
              >
                ◀ Previous
              </button>
              <span style="align-self: center; padding: 0 8px; font-weight: 600;">
                Page ${pagination.page} / ${pagination.totalPages || 1}
              </span>
              <button
                class="btn btn-outline btn-sm"
                ${pagination.page >= pagination.totalPages ? 'disabled' : ''}
                onclick="PatientsView.changePage(${pagination.page + 1})"
              >
                Next ▶
              </button>
            </div>
          </div>
        </div>
      `;

      // Event listeners for search and filters
      const searchInput = document.getElementById('patient-search-input');
      if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', e => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            this.searchQuery = e.target.value.trim();
            this.currentPage = 1;
            this.loadPatients(container);
          }, 350);
        });
      }

      const statusSelect = document.getElementById('patient-status-select');
      if (statusSelect) {
        statusSelect.addEventListener('change', e => {
          this.statusFilter = e.target.value;
          this.currentPage = 1;
          this.loadPatients(container);
        });
      }
    } catch (err) {
      container.innerHTML = `
        <div class="card" style="text-align: center; color: var(--color-danger); padding: 40px;">
          <h3>Error loading patients</h3>
          <p>${err.message}</p>
        </div>
      `;
    }
  },

  changePage(newPage) {
    this.currentPage = newPage;
    const container = document.getElementById('app-content');
    this.loadPatients(container);
  },

  async viewDetails(patientId) {
    try {
      const res = await API.get(`/api/patients/${patientId}`);
      const p = res.patient;

      openGenericModal(
        `Patient Profile — ${p.patient_code}`,
        `
          <div style="font-size: 0.88rem;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
              <div><strong style="color: var(--color-text-muted);">Full Name:</strong><br>${p.full_name}</div>
              <div><strong style="color: var(--color-text-muted);">Status:</strong><br><span class="badge badge-success">${p.status}</span></div>
              <div><strong style="color: var(--color-text-muted);">Date of Birth:</strong><br>${p.dob}</div>
              <div><strong style="color: var(--color-text-muted);">Gender:</strong><br>${p.gender}</div>
              <div><strong style="color: var(--color-text-muted);">Blood Group:</strong><br>${p.blood_group || 'N/A'}</div>
              <div><strong style="color: var(--color-text-muted);">Contact Phone:</strong><br>${p.phone}</div>
              <div><strong style="color: var(--color-text-muted);">Email Address:</strong><br>${p.email || 'N/A'}</div>
              <div><strong style="color: var(--color-text-muted);">Registered By:</strong><br>${p.registered_by_name || 'Staff User'}</div>
            </div>
            <div style="margin-bottom: 12px;">
              <strong style="color: var(--color-text-muted);">Residential Address:</strong><br>
              ${p.address || 'No address provided'}
            </div>
            <div style="margin-bottom: 12px;">
              <strong style="color: var(--color-text-muted);">Emergency Contact:</strong><br>
              ${p.emergency_contact_name || 'N/A'} (${p.emergency_contact_phone || 'N/A'})
            </div>
            <div style="margin-bottom: 12px;">
              <strong style="color: var(--color-text-muted);">Known Allergies:</strong><br>
              <span style="color: var(--color-danger); font-weight: 600;">${p.allergies || 'None recorded'}</span>
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
  },

  openNewPatientModal() {
    openGenericModal(
      'Register New Fictional Patient',
      `
        <form id="new-patient-form" onsubmit="event.preventDefault(); PatientsView.submitNewPatient();">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Full Name (Fictional) *</label>
              <input type="text" id="np-name" class="form-control" required placeholder="e.g. Johnathan Smith">
            </div>
            <div class="form-group">
              <label class="form-label">Date of Birth (YYYY-MM-DD) *</label>
              <input type="date" id="np-dob" class="form-control" required>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Gender *</label>
              <select id="np-gender" class="form-control" required>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Blood Group</label>
              <select id="np-blood" class="form-control">
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Contact Phone *</label>
              <input type="tel" id="np-phone" class="form-control" required placeholder="+1-555-0123">
            </div>
            <div class="form-group">
              <label class="form-label">Email Address</label>
              <input type="email" id="np-email" class="form-control" placeholder="fictional@example.com">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Address</label>
            <input type="text" id="np-address" class="form-control" placeholder="Street, City, Sector">
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Emergency Contact Name</label>
              <input type="text" id="np-em-name" class="form-control" placeholder="Spouse / Parent Name">
            </div>
            <div class="form-group">
              <label class="form-label">Emergency Phone</label>
              <input type="tel" id="np-em-phone" class="form-control" placeholder="+1-555-0199">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Known Allergies</label>
            <input type="text" id="np-allergies" class="form-control" placeholder="e.g. Penicillin, Latex (or None)">
          </div>
        </form>
      `,
      `
        <button class="btn btn-outline" onclick="closeGenericModal()">Cancel</button>
        <button class="btn btn-primary" onclick="PatientsView.submitNewPatient()">Register Patient</button>
      `
    );
  },

  async submitNewPatient() {
    const payload = {
      fullName: document.getElementById('np-name')?.value,
      dob: document.getElementById('np-dob')?.value,
      gender: document.getElementById('np-gender')?.value,
      bloodGroup: document.getElementById('np-blood')?.value,
      phone: document.getElementById('np-phone')?.value,
      email: document.getElementById('np-email')?.value,
      address: document.getElementById('np-address')?.value,
      emergencyContactName: document.getElementById('np-em-name')?.value,
      emergencyContactPhone: document.getElementById('np-em-phone')?.value,
      allergies: document.getElementById('np-allergies')?.value
    };

    if (!payload.fullName || !payload.dob || !payload.phone) {
      showToast('Please fill in all required fields.', 'warning');
      return;
    }

    try {
      const res = await API.post('/api/patients', payload);
      closeGenericModal();
      showToast(`Patient ${res.patient.patientCode} registered successfully!`, 'success');
      this.loadPatients(document.getElementById('app-content'));
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  async openEditModal(patientId) {
    try {
      const res = await API.get(`/api/patients/${patientId}`);
      const p = res.patient;

      openGenericModal(
        `Edit Demographic Info — ${p.patient_code}`,
        `
          <form id="edit-patient-form">
            <div class="form-group">
              <label class="form-label">Patient Name (Non-editable)</label>
              <input type="text" class="form-control" value="${p.full_name}" disabled>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Contact Phone</label>
                <input type="tel" id="ep-phone" class="form-control" value="${p.phone || ''}">
              </div>
              <div class="form-group">
                <label class="form-label">Email</label>
                <input type="email" id="ep-email" class="form-control" value="${p.email || ''}">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Address</label>
              <input type="text" id="ep-address" class="form-control" value="${p.address || ''}">
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Emergency Contact Name</label>
                <input type="text" id="ep-em-name" class="form-control" value="${p.emergency_contact_name || ''}">
              </div>
              <div class="form-group">
                <label class="form-label">Emergency Phone</label>
                <input type="tel" id="ep-em-phone" class="form-control" value="${p.emergency_contact_phone || ''}">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Allergies</label>
              <input type="text" id="ep-allergies" class="form-control" value="${p.allergies || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Record Status</label>
              <select id="ep-status" class="form-control">
                <option value="ACTIVE" ${p.status === 'ACTIVE' ? 'selected' : ''}>Active</option>
                <option value="INPATIENT" ${p.status === 'INPATIENT' ? 'selected' : ''}>Inpatient</option>
                <option value="DISCHARGED" ${p.status === 'DISCHARGED' ? 'selected' : ''}>Discharged</option>
              </select>
            </div>
          </form>
        `,
        `
          <button class="btn btn-outline" onclick="closeGenericModal()">Cancel</button>
          <button class="btn btn-primary" onclick="PatientsView.submitEditPatient(${patientId})">Save Changes</button>
        `
      );
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  async submitEditPatient(patientId) {
    const payload = {
      phone: document.getElementById('ep-phone')?.value,
      email: document.getElementById('ep-email')?.value,
      address: document.getElementById('ep-address')?.value,
      emergencyContactName: document.getElementById('ep-em-name')?.value,
      emergencyContactPhone: document.getElementById('ep-em-phone')?.value,
      allergies: document.getElementById('ep-allergies')?.value,
      status: document.getElementById('ep-status')?.value
    };

    try {
      await API.put(`/api/patients/${patientId}`, payload);
      closeGenericModal();
      showToast('Demographic information updated successfully.', 'success');
      this.loadPatients(document.getElementById('app-content'));
    } catch (e) {
      showToast(e.message, 'error');
    }
  }
};
