// ==============================================================================
// MediCloud Doctor Directory & Management View
// ==============================================================================

const DoctorsView = {
  departmentFilter: '',
  availabilityFilter: '',

  async render(container) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <span style="font-size: 2rem;">⏳</span>
        <p style="margin-top: 10px; color: var(--color-text-muted);">Loading doctor directory...</p>
      </div>
    `;

    await this.loadDoctors(container);
  },

  async loadDoctors(container) {
    try {
      const queryParams = new URLSearchParams();
      if (this.departmentFilter) queryParams.set('department', this.departmentFilter);
      if (this.availabilityFilter) queryParams.set('availability', this.availabilityFilter);

      const [res, deptRes] = await Promise.all([
        API.get(`/api/doctors?${queryParams.toString()}`),
        API.get('/api/doctors/departments')
      ]);

      const doctors = res.doctors || [];
      const departments = deptRes.departments || [];
      const isAdmin = Auth.user.role === 'ADMIN';

      container.innerHTML = `
        <!-- Filter Bar -->
        <div class="card" style="margin-bottom: 20px; padding: 18px 24px;">
          <div class="filter-bar" style="margin-bottom: 0;">
            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
              <select id="doc-dept-select" class="form-control" style="width: auto;">
                <option value="">All Departments</option>
                ${departments.map(d => `
                  <option value="${d}" ${this.departmentFilter === d ? 'selected' : ''}>${d}</option>
                `).join('')}
              </select>

              <select id="doc-avail-select" class="form-control" style="width: auto;">
                <option value="">All Availability Statuses</option>
                <option value="AVAILABLE" ${this.availabilityFilter === 'AVAILABLE' ? 'selected' : ''}>Available</option>
                <option value="IN_CONSULTATION" ${this.availabilityFilter === 'IN_CONSULTATION' ? 'selected' : ''}>In Consultation</option>
                <option value="ON_LEAVE" ${this.availabilityFilter === 'ON_LEAVE' ? 'selected' : ''}>On Leave</option>
              </select>
            </div>

            ${isAdmin ? `
              <button class="btn btn-primary" onclick="DoctorsView.openNewDoctorModal()">
                ➕ Add Doctor Profile
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Doctors Grid / List -->
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px;">
          ${doctors.length === 0 ? `
            <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--color-text-muted);">
              No doctors found matching selected filters.
            </div>
          ` : doctors.map(doc => {
            const canToggle = isAdmin || (Auth.user.role === 'DOCTOR' && Auth.user.id === doc.user_id);
            return `
              <div class="card" style="margin-bottom: 0; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px;">
                    <div>
                      <h3 style="font-size: 1.05rem; color: var(--color-navy-primary);">${doc.full_name}</h3>
                      <div style="font-size: 0.78rem; font-weight: 600; color: var(--color-teal-dark);">${doc.doctor_code}</div>
                    </div>
                    <span class="badge ${
                      doc.availability_status === 'AVAILABLE' ? 'badge-success' :
                      doc.availability_status === 'IN_CONSULTATION' ? 'badge-warning' : 'badge-neutral'
                    }">
                      ${doc.availability_status.replace('_', ' ')}
                    </span>
                  </div>

                  <div style="font-size: 0.85rem; margin-bottom: 14px;">
                    <div style="margin-bottom: 6px;">
                      <span class="badge badge-info">${doc.department}</span>
                    </div>
                    <p style="color: var(--color-text-secondary); margin-bottom: 8px;">
                      <strong>Specialization:</strong> ${doc.specialization}
                    </p>
                    <div style="color: var(--color-text-muted); font-size: 0.8rem;">
                      📍 ${doc.room_number || 'Room TBD'} • ✉️ ${doc.email}
                    </div>
                  </div>
                </div>

                <div style="padding-top: 14px; border-top: 1px solid var(--color-border); display: flex; justify-content: space-between; align-items: center;">
                  <button class="btn btn-outline btn-sm" onclick="DoctorsView.viewDoctorSchedule(${doc.id})">
                    View Schedule
                  </button>

                  ${canToggle ? `
                    <select
                      class="form-control"
                      style="width: auto; padding: 4px 8px; font-size: 0.78rem;"
                      onchange="DoctorsView.updateAvailability(${doc.id}, this.value)"
                    >
                      <option value="AVAILABLE" ${doc.availability_status === 'AVAILABLE' ? 'selected' : ''}>Available</option>
                      <option value="IN_CONSULTATION" ${doc.availability_status === 'IN_CONSULTATION' ? 'selected' : ''}>In Consultation</option>
                      <option value="ON_LEAVE" ${doc.availability_status === 'ON_LEAVE' ? 'selected' : ''}>On Leave</option>
                    </select>
                  ` : `
                    <span style="font-size: 0.75rem; color: var(--color-text-muted);">
                      ${doc.availability_status}
                    </span>
                  `}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;

      // Filter events
      const deptSelect = document.getElementById('doc-dept-select');
      const availSelect = document.getElementById('doc-avail-select');
      if (deptSelect) {
        deptSelect.addEventListener('change', e => {
          this.departmentFilter = e.target.value;
          this.loadDoctors(container);
        });
      }
      if (availSelect) {
        availSelect.addEventListener('change', e => {
          this.availabilityFilter = e.target.value;
          this.loadDoctors(container);
        });
      }
    } catch (err) {
      container.innerHTML = `
        <div class="card" style="text-align: center; color: var(--color-danger); padding: 40px;">
          <h3>Error loading doctors</h3>
          <p>${err.message}</p>
        </div>
      `;
    }
  },

  async updateAvailability(doctorId, status) {
    try {
      await API.put(`/api/doctors/${doctorId}/availability`, { status });
      showToast(`Doctor availability changed to ${status}`, 'success');
      this.loadDoctors(document.getElementById('app-content'));
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  async viewDoctorSchedule(doctorId) {
    try {
      const res = await API.get(`/api/doctors/${doctorId}`);
      const doc = res.doctor;
      const apts = res.appointments || [];

      openGenericModal(
        `Consultation Schedule — ${doc.full_name}`,
        `
          <div style="font-size: 0.88rem;">
            <p style="margin-bottom: 14px; color: var(--color-text-secondary);">
              Department: <strong>${doc.department}</strong> (${doc.specialization}) • Location: <strong>${doc.room_number || 'Room TBD'}</strong>
            </p>
            ${apts.length === 0 ? `
              <p style="padding: 20px; text-align: center; color: var(--color-text-muted);">
                No upcoming consultations currently scheduled for this doctor.
              </p>
            ` : `
              <div class="table-responsive">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Patient</th>
                      <th>Type</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${apts.map(a => `
                      <tr>
                        <td>${a.appointment_date}</td>
                        <td>${a.appointment_time}</td>
                        <td>${a.patient_name} <br><span style="font-size: 0.72rem; color: var(--color-text-muted);">${a.patient_code}</span></td>
                        <td><span class="badge badge-neutral">${a.type}</span></td>
                        <td><span class="badge badge-info">${a.status}</span></td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `}
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

  openNewDoctorModal() {
    openGenericModal(
      'Create New Doctor Profile (Administrator Only)',
      `
        <form id="new-doc-form">
          <div class="form-group">
            <label class="form-label">Doctor Full Name *</label>
            <input type="text" id="nd-name" class="form-control" required placeholder="e.g. Dr. Jennifer Lawrence, MD">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Department *</label>
              <select id="nd-dept" class="form-control" required>
                <option value="Cardiology">Cardiology</option>
                <option value="Neurology">Neurology</option>
                <option value="Pediatrics">Pediatrics</option>
                <option value="Orthopedics">Orthopedics</option>
                <option value="General Medicine">General Medicine</option>
                <option value="Oncology">Oncology</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Consultation Suite / Room</label>
              <input type="text" id="nd-room" class="form-control" placeholder="e.g. Suite 204">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Specialization Details *</label>
            <input type="text" id="nd-spec" class="form-control" required placeholder="e.g. Interventional Cardiology & Angiography">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Hospital Email *</label>
              <input type="email" id="nd-email" class="form-control" required placeholder="dr.lawrence@medicloud.local">
            </div>
            <div class="form-group">
              <label class="form-label">Contact Phone *</label>
              <input type="tel" id="nd-phone" class="form-control" required placeholder="+1-555-0250">
            </div>
          </div>
        </form>
      `,
      `
        <button class="btn btn-outline" onclick="closeGenericModal()">Cancel</button>
        <button class="btn btn-primary" onclick="DoctorsView.submitNewDoctor()">Create Doctor Profile</button>
      `
    );
  },

  async submitNewDoctor() {
    const payload = {
      fullName: document.getElementById('nd-name')?.value,
      department: document.getElementById('nd-dept')?.value,
      roomNumber: document.getElementById('nd-room')?.value,
      specialization: document.getElementById('nd-spec')?.value,
      email: document.getElementById('nd-email')?.value,
      phone: document.getElementById('nd-phone')?.value
    };

    if (!payload.fullName || !payload.department || !payload.specialization || !payload.email || !payload.phone) {
      showToast('Please complete all required doctor fields.', 'warning');
      return;
    }

    try {
      const res = await API.post('/api/doctors', payload);
      closeGenericModal();
      showToast(`Doctor ${res.doctor.doctorCode} added successfully!`, 'success');
      this.loadDoctors(document.getElementById('app-content'));
    } catch (e) {
      showToast(e.message, 'error');
    }
  }
};
