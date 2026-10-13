// ==============================================================================
// MediCloud Appointment Management View
// ==============================================================================

const AppointmentsView = {
  statusFilter: '',
  dateFilter: '',

  async render(container) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <span style="font-size: 2rem;">⏳</span>
        <p style="margin-top: 10px; color: var(--color-text-muted);">Loading appointment roster...</p>
      </div>
    `;

    await this.loadAppointments(container);
  },

  async loadAppointments(container) {
    try {
      const queryParams = new URLSearchParams();
      if (this.statusFilter) queryParams.set('status', this.statusFilter);
      if (this.dateFilter) queryParams.set('date', this.dateFilter);

      const res = await API.get(`/api/appointments?${queryParams.toString()}`);
      const appointments = res.appointments || [];
      const canSchedule = ['ADMIN', 'RECEPTIONIST'].includes(Auth.user.role);

      container.innerHTML = `
        <!-- Filter Bar -->
        <div class="card" style="margin-bottom: 20px; padding: 18px 24px;">
          <div class="filter-bar" style="margin-bottom: 0;">
            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
              <input
                type="date"
                id="apt-date-filter"
                class="form-control"
                style="width: auto;"
                value="${this.dateFilter}"
              >

              <select id="apt-status-filter" class="form-control" style="width: auto;">
                <option value="">All Statuses</option>
                <option value="SCHEDULED" ${this.statusFilter === 'SCHEDULED' ? 'selected' : ''}>Scheduled</option>
                <option value="IN_PROGRESS" ${this.statusFilter === 'IN_PROGRESS' ? 'selected' : ''}>In Progress</option>
                <option value="COMPLETED" ${this.statusFilter === 'COMPLETED' ? 'selected' : ''}>Completed</option>
                <option value="CANCELLED" ${this.statusFilter === 'CANCELLED' ? 'selected' : ''}>Cancelled</option>
              </select>

              ${this.dateFilter || this.statusFilter ? `
                <button class="btn btn-outline btn-sm" onclick="AppointmentsView.clearFilters()">Clear Filters</button>
              ` : ''}
            </div>

            ${canSchedule ? `
              <button class="btn btn-primary" onclick="AppointmentsView.openNewAppointmentModal()">
                📅 Schedule Appointment
              </button>
            ` : `
              <span class="badge badge-info">Doctor View: Filtered to Assigned Roster</span>
            `}
          </div>
        </div>

        <!-- Appointments Table -->
        <div class="card" style="padding: 0; overflow: hidden;">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Date & Time</th>
                  <th>Patient</th>
                  <th>Attending Doctor</th>
                  <th>Department</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th style="text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${appointments.length === 0 ? `
                  <tr>
                    <td colspan="8" style="text-align: center; padding: 36px; color: var(--color-text-muted);">
                      No appointments found for selected filter criteria.
                    </td>
                  </tr>
                ` : appointments.map(a => `
                  <tr>
                    <td><strong>${a.appointment_code}</strong></td>
                    <td>
                      <strong>${a.appointment_date}</strong><br>
                      <span style="font-size: 0.78rem; color: var(--color-teal-dark);">🕒 ${a.appointment_time}</span>
                    </td>
                    <td>
                      ${a.patient_name}<br>
                      <span style="font-size: 0.72rem; color: var(--color-text-muted);">${a.patient_code}</span>
                    </td>
                    <td>${a.doctor_name}</td>
                    <td><span class="badge badge-info">${a.department}</span></td>
                    <td><span class="badge badge-neutral">${a.type.replace('_', ' ')}</span></td>
                    <td>
                      <span class="badge ${
                        a.status === 'COMPLETED' ? 'badge-success' :
                        a.status === 'IN_PROGRESS' ? 'badge-warning' :
                        a.status === 'CANCELLED' ? 'badge-danger' : 'badge-neutral'
                      }">
                        ${a.status}
                      </span>
                    </td>
                    <td style="text-align: right;">
                      ${a.status === 'SCHEDULED' ? `
                        <button class="btn btn-outline btn-sm" onclick="AppointmentsView.updateStatus(${a.id}, 'IN_PROGRESS')">
                          Start
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="AppointmentsView.updateStatus(${a.id}, 'CANCELLED')">
                          Cancel
                        </button>
                      ` : a.status === 'IN_PROGRESS' ? `
                        <button class="btn btn-primary btn-sm" onclick="AppointmentsView.updateStatus(${a.id}, 'COMPLETED')">
                          Complete
                        </button>
                        ${Auth.user.role === 'DOCTOR' ? `
                          <button class="btn btn-outline btn-sm" onclick="MedicalRecordsView.openNewRecordModal(${a.patient_id})">
                            Add Note
                          </button>
                        ` : ''}
                      ` : `
                        <span style="font-size: 0.75rem; color: var(--color-text-muted);">Archived</span>
                      `}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

      // Filter events
      const dateInput = document.getElementById('apt-date-filter');
      const statusSelect = document.getElementById('apt-status-filter');
      if (dateInput) {
        dateInput.addEventListener('change', e => {
          this.dateFilter = e.target.value;
          this.loadAppointments(container);
        });
      }
      if (statusSelect) {
        statusSelect.addEventListener('change', e => {
          this.statusFilter = e.target.value;
          this.loadAppointments(container);
        });
      }
    } catch (err) {
      container.innerHTML = `
        <div class="card" style="text-align: center; color: var(--color-danger); padding: 40px;">
          <h3>Error loading appointments</h3>
          <p>${err.message}</p>
        </div>
      `;
    }
  },

  clearFilters() {
    this.dateFilter = '';
    this.statusFilter = '';
    this.loadAppointments(document.getElementById('app-content'));
  },

  async updateStatus(appointmentId, newStatus) {
    try {
      await API.put(`/api/appointments/${appointmentId}/status`, { status: newStatus });
      showToast(`Appointment status updated to ${newStatus}`, 'success');
      this.loadAppointments(document.getElementById('app-content'));
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  async openNewAppointmentModal() {
    try {
      const [patientsRes, docsRes] = await Promise.all([
        API.get('/api/patients?limit=50'),
        API.get('/api/doctors?availability=AVAILABLE')
      ]);

      const patients = patientsRes.data || [];
      const doctors = docsRes.doctors || [];
      const todayStr = new Date().toISOString().split('T')[0];

      if (patients.length === 0) {
        showToast('Please register at least one fictional patient before scheduling an appointment.', 'warning');
        return;
      }
      if (doctors.length === 0) {
        showToast('No doctors currently available. Please check doctor availability status.', 'warning');
        return;
      }

      openGenericModal(
        'Schedule Fictional Patient Appointment',
        `
          <form id="new-apt-form">
            <div class="form-group">
              <label class="form-label">Select Fictional Patient *</label>
              <select id="na-patient" class="form-control" required>
                ${patients.map(p => `
                  <option value="${p.id}">${p.full_name} (${p.patient_code}) — Blood: ${p.blood_group || 'N/A'}</option>
                `).join('')}
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Select Attending Doctor *</label>
              <select id="na-doctor" class="form-control" required onchange="AppointmentsView.syncDoctorDepartment(this)">
                ${doctors.map(d => `
                  <option value="${d.id}" data-dept="${d.department}">${d.full_name} — ${d.department} (${d.doctor_code})</option>
                `).join('')}
              </select>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Hospital Department</label>
                <input type="text" id="na-dept" class="form-control" readonly value="${doctors[0]?.department || 'Cardiology'}">
              </div>
              <div class="form-group">
                <label class="form-label">Consultation Type *</label>
                <select id="na-type" class="form-control" required>
                  <option value="ROUTINE_CHECKUP">Routine Checkup</option>
                  <option value="FOLLOW_UP">Follow-up Consultation</option>
                  <option value="SPECIALIST_CONSULTATION">Specialist Consultation</option>
                  <option value="EMERGENCY">Emergency Evaluation</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Appointment Date (Min: Today) *</label>
                <input type="date" id="na-date" class="form-control" min="${todayStr}" value="${todayStr}" required>
              </div>
              <div class="form-group">
                <label class="form-label">Consultation Time Slot *</label>
                <select id="na-time" class="form-control" required>
                  <option value="09:00">09:00 AM</option>
                  <option value="09:30">09:30 AM</option>
                  <option value="10:00">10:00 AM</option>
                  <option value="10:30">10:30 AM</option>
                  <option value="11:00">11:00 AM</option>
                  <option value="11:30">11:30 AM</option>
                  <option value="14:00">02:00 PM</option>
                  <option value="14:30">02:30 PM</option>
                  <option value="15:00">03:00 PM</option>
                  <option value="15:30">03:30 PM</option>
                  <option value="16:00">04:00 PM</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Administrative Reason / Notes</label>
              <textarea id="na-notes" class="form-control" placeholder="Non-sensitive reason for consultation (e.g. Annual cardiovascular follow-up)"></textarea>
            </div>
          </form>
        `,
        `
          <button class="btn btn-outline" onclick="closeGenericModal()">Cancel</button>
          <button class="btn btn-primary" onclick="AppointmentsView.submitNewAppointment()">Confirm Booking</button>
        `
      );
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  syncDoctorDepartment(selectEl) {
    const selectedOption = selectEl.options[selectEl.selectedIndex];
    const dept = selectedOption.getAttribute('data-dept');
    const deptInput = document.getElementById('na-dept');
    if (deptInput && dept) {
      deptInput.value = dept;
    }
  },

  async submitNewAppointment() {
    const payload = {
      patientId: parseInt(document.getElementById('na-patient')?.value, 10),
      doctorId: parseInt(document.getElementById('na-doctor')?.value, 10),
      department: document.getElementById('na-dept')?.value,
      appointmentDate: document.getElementById('na-date')?.value,
      appointmentTime: document.getElementById('na-time')?.value,
      type: document.getElementById('na-type')?.value,
      notes: document.getElementById('na-notes')?.value
    };

    if (!payload.patientId || !payload.doctorId || !payload.appointmentDate || !payload.appointmentTime) {
      showToast('Please fill in all appointment details.', 'warning');
      return;
    }

    try {
      const res = await API.post('/api/appointments', payload);
      closeGenericModal();
      showToast(`Appointment ${res.appointment.appointmentCode} booked for ${res.appointment.patientName}!`, 'success');
      this.loadAppointments(document.getElementById('app-content'));
    } catch (e) {
      showToast(e.message, 'error');
    }
  }
};
