// ==============================================================================
// MediCloud Medical Records (Clinical Notes) View
// Strictly protected clinical records module with RBAC enforcement
// ==============================================================================

const MedicalRecordsView = {
  async render(container) {
    // Check if user is RECEPTIONIST: Show Security Interception Card (403 Forbidden Demo)
    if (Auth.user.role === 'RECEPTIONIST') {
      container.innerHTML = `
        <div class="denied-card">
          <div class="denied-icon">🚫</div>
          <h3>HTTP 403 Forbidden — Clinical Access Prohibited</h3>
          <p>
            <strong>Principle of Least Privilege (RBAC):</strong> Front-desk Receptionist accounts are strictly prohibited from viewing or editing patient medical records, clinical diagnoses, prescriptions, and clinical notes.
          </p>
          <div style="margin-bottom: 20px;">
            <span class="denied-audit-badge">
              SECURITY_AUDIT: RECEPTIONIST_CLINICAL_ACCESS_BLOCKED (ACTOR: ${Auth.user.username})
            </span>
          </div>
          <p style="font-size: 0.82rem; color: var(--color-text-muted);">
            In a cloud environment compliant with healthcare privacy principles, clinical separation ensures operational staff only access demographic and scheduling resources, preventing horizontal and vertical privilege escalation.
          </p>
          <button class="btn btn-primary" onclick="openRoleModal()">
            Switch to Doctor / Administrator Account
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <span style="font-size: 2rem;">⏳</span>
        <p style="margin-top: 10px; color: var(--color-text-muted);">Loading authorized clinical records...</p>
      </div>
    `;

    await this.loadRecords(container);
  },

  async loadRecords(container) {
    try {
      const res = await API.get('/api/medical-records');
      const records = res.records || [];
      const isDoctor = Auth.user.role === 'DOCTOR';

      container.innerHTML = `
        <!-- Header & Action Card -->
        <div class="card" style="margin-bottom: 20px; padding: 18px 24px;">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
            <div>
              <h3 style="font-size: 1.05rem; color: var(--color-navy-primary);">
                🔒 Protected Clinical Records
              </h3>
              <p style="font-size: 0.8rem; margin: 0; color: var(--color-text-muted);">
                Authorized clinical documentation for attending physicians and medical audits.
              </p>
            </div>

            <div>
              ${isDoctor ? `
                <button class="btn btn-primary" onclick="MedicalRecordsView.openNewRecordModal()">
                  ➕ Add Clinical Note
                </button>
              ` : `
                <span class="badge badge-info">Administrator Audit Mode: Read-Only Clinical Access</span>
              `}
            </div>
          </div>
        </div>

        <!-- Clinical Records Table -->
        <div class="card" style="padding: 0; overflow: hidden;">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Record Code</th>
                  <th>Patient</th>
                  <th>Attending Doctor</th>
                  <th>Fictional Diagnosis</th>
                  <th>Vital Signs</th>
                  <th>Date Recorded</th>
                  <th style="text-align: right;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${records.length === 0 ? `
                  <tr>
                    <td colspan="7" style="text-align: center; padding: 36px; color: var(--color-text-muted);">
                      No clinical records found.
                    </td>
                  </tr>
                ` : records.map(r => {
                  const vitals = r.vital_signs || {};
                  const vitalsSummary = vitals.bp ? `BP: ${vitals.bp} • HR: ${vitals.pulse || 'N/A'}` : 'Vitals logged';
                  return `
                    <tr>
                      <td><strong>${r.record_code}</strong></td>
                      <td>
                        <strong>${r.patient_name}</strong><br>
                        <span style="font-size: 0.72rem; color: var(--color-text-muted);">${r.patient_code}</span>
                      </td>
                      <td>
                        ${r.doctor_name}<br>
                        <span style="font-size: 0.72rem; color: var(--color-teal-dark);">${r.department}</span>
                      </td>
                      <td>
                        <span style="font-weight: 500; color: var(--color-navy-primary);">${r.diagnosis}</span>
                      </td>
                      <td>
                        <span class="badge badge-neutral">${vitalsSummary}</span>
                      </td>
                      <td>${r.created_at ? r.created_at.split(' ')[0] : 'Today'}</td>
                      <td style="text-align: right;">
                        <button class="btn btn-outline btn-sm" onclick="MedicalRecordsView.viewFullRecord(${r.id})">
                          Inspect Note
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `
        <div class="card" style="text-align: center; color: var(--color-danger); padding: 40px;">
          <h3>Error loading medical records</h3>
          <p>${err.message}</p>
        </div>
      `;
    }
  },

  async viewFullRecord(recordId) {
    try {
      const res = await API.get('/api/medical-records');
      const record = (res.records || []).find(r => r.id === recordId);
      if (!record) throw new Error('Record not found');

      const vitals = record.vital_signs || {};

      openGenericModal(
        `Clinical Documentation — ${record.record_code}`,
        `
          <div style="font-size: 0.88rem;">
            <div style="background: var(--color-surface-muted); padding: 14px; border-radius: var(--radius-md); margin-bottom: 16px;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <div><strong style="color: var(--color-text-muted);">Patient:</strong> ${record.patient_name} (${record.patient_code})</div>
                <div><strong style="color: var(--color-text-muted);">Attending Physician:</strong> ${record.doctor_name}</div>
                <div><strong style="color: var(--color-text-muted);">Specialty:</strong> ${record.department}</div>
                <div><strong style="color: var(--color-text-muted);">Recorded On:</strong> ${record.created_at}</div>
              </div>
            </div>

            <div style="margin-bottom: 16px;">
              <h4 style="font-size: 0.95rem; margin-bottom: 6px; color: var(--color-navy-primary);">Primary Diagnosis (Fictional):</h4>
              <div style="padding: 10px 14px; background: #f0fdf4; border-left: 4px solid var(--color-success); border-radius: var(--radius-sm); font-weight: 600; color: #166534;">
                ${record.diagnosis}
              </div>
            </div>

            <div style="margin-bottom: 16px;">
              <h4 style="font-size: 0.95rem; margin-bottom: 6px; color: var(--color-navy-primary);">Vital Signs:</h4>
              <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <span class="badge badge-neutral">BP: ${vitals.bp || '120/80 mmHg'}</span>
                <span class="badge badge-neutral">Pulse: ${vitals.pulse || '72 bpm'}</span>
                <span class="badge badge-neutral">Temp: ${vitals.temp || '98.6 F'}</span>
                <span class="badge badge-neutral">SpO2: ${vitals.spo2 || '99%'}</span>
              </div>
            </div>

            <div style="margin-bottom: 16px;">
              <h4 style="font-size: 0.95rem; margin-bottom: 6px; color: var(--color-navy-primary);">Physician Clinical Observations & Notes:</h4>
              <div style="background: var(--color-surface); border: 1px solid var(--color-border); padding: 12px 14px; border-radius: var(--radius-md); line-height: 1.6; color: var(--color-text-primary);">
                ${record.clinical_notes}
              </div>
            </div>

            <div style="margin-bottom: 12px;">
              <h4 style="font-size: 0.95rem; margin-bottom: 6px; color: var(--color-navy-primary);">Prescription & Treatment Protocol:</h4>
              <div style="background: var(--color-blue-soft); border-left: 4px solid var(--color-blue-primary); padding: 10px 14px; border-radius: var(--radius-sm); color: #075985;">
                ${record.prescription || 'No pharmaceuticals prescribed.'}
              </div>
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

  async viewPatientHistory(patientId) {
    try {
      const res = await API.get(`/api/medical-records/patient/${patientId}`);
      const p = res.patient;
      const records = res.records || [];

      openGenericModal(
        `Clinical History — ${p.full_name} (${p.patient_code})`,
        `
          <div style="font-size: 0.88rem;">
            <div style="margin-bottom: 14px; padding: 10px; background: var(--color-surface-muted); border-radius: var(--radius-sm);">
              DOB: <strong>${p.dob}</strong> • Blood: <strong>${p.blood_group || 'N/A'}</strong> • Allergies: <strong style="color: var(--color-danger);">${p.allergies || 'None'}</strong>
            </div>
            ${records.length === 0 ? `
              <p style="padding: 20px; text-align: center; color: var(--color-text-muted);">
                No clinical records recorded yet for this fictional patient.
              </p>
            ` : records.map(r => `
              <div style="border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 14px; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                  <strong>${r.record_code} — ${r.diagnosis}</strong>
                  <span style="font-size: 0.78rem; color: var(--color-text-muted);">${r.created_at}</span>
                </div>
                <div style="font-size: 0.8rem; color: var(--color-text-secondary); margin-bottom: 6px;">
                  By: <strong>${r.doctor_name}</strong> (${r.department})
                </div>
                <div style="font-size: 0.85rem; color: var(--color-text-primary); margin-bottom: 6px;">
                  ${r.clinical_notes}
                </div>
                <div style="font-size: 0.8rem; color: var(--color-teal-dark);">
                  💊 Rx: ${r.prescription || 'None'}
                </div>
              </div>
            `).join('')}
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

  async openNewRecordModal(preselectedPatientId = null) {
    try {
      const patientsRes = await API.get('/api/patients?limit=50');
      const patients = patientsRes.data || [];

      openGenericModal(
        'Add New Clinical Record (Authorized Physician)',
        `
          <form id="new-record-form">
            <div class="form-group">
              <label class="form-label">Select Patient *</label>
              <select id="nr-patient" class="form-control" required>
                ${patients.map(p => `
                  <option value="${p.id}" ${preselectedPatientId === p.id ? 'selected' : ''}>
                    ${p.full_name} (${p.patient_code}) — Allergies: ${p.allergies || 'None'}
                  </option>
                `).join('')}
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Clinical Diagnosis (Fictional) *</label>
              <input type="text" id="nr-diagnosis" class="form-control" required placeholder="e.g. Mild Allergic Rhinitis, Grade 1 Hypertension">
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Blood Pressure (mmHg)</label>
                <input type="text" id="nr-bp" class="form-control" placeholder="120/80">
              </div>
              <div class="form-group">
                <label class="form-label">Pulse (bpm)</label>
                <input type="text" id="nr-pulse" class="form-control" placeholder="72">
              </div>
              <div class="form-group">
                <label class="form-label">Temperature (F)</label>
                <input type="text" id="nr-temp" class="form-control" placeholder="98.6">
              </div>
              <div class="form-group">
                <label class="form-label">Oxygen Saturation (%)</label>
                <input type="text" id="nr-spo2" class="form-control" placeholder="99">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Clinical Observations & Clinical Notes *</label>
              <textarea id="nr-notes" class="form-control" required style="min-height: 100px;" placeholder="Document clinical examination observations, symptomatic presentation, and clinical recommendations."></textarea>
            </div>

            <div class="form-group">
              <label class="form-label">Prescription & Therapy Instructions</label>
              <textarea id="nr-rx" class="form-control" placeholder="Prescription medication, dosage, frequency, and duration."></textarea>
            </div>
          </form>
        `,
        `
          <button class="btn btn-outline" onclick="closeGenericModal()">Cancel</button>
          <button class="btn btn-primary" onclick="MedicalRecordsView.submitNewRecord()">Save Clinical Note</button>
        `
      );
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  async submitNewRecord() {
    const payload = {
      patientId: parseInt(document.getElementById('nr-patient')?.value, 10),
      diagnosis: document.getElementById('nr-diagnosis')?.value,
      vitalSigns: {
        bp: document.getElementById('nr-bp')?.value || '120/80',
        pulse: document.getElementById('nr-pulse')?.value || '72',
        temp: document.getElementById('nr-temp')?.value || '98.6',
        spo2: document.getElementById('nr-spo2')?.value || '99%'
      },
      clinicalNotes: document.getElementById('nr-notes')?.value,
      prescription: document.getElementById('nr-rx')?.value
    };

    if (!payload.patientId || !payload.diagnosis || !payload.clinicalNotes) {
      showToast('Please provide patient, diagnosis, and clinical notes.', 'warning');
      return;
    }

    try {
      const res = await API.post('/api/medical-records', payload);
      closeGenericModal();
      showToast(`Clinical note ${res.record.recordCode} saved successfully!`, 'success');
      this.loadRecords(document.getElementById('app-content'));
    } catch (e) {
      showToast(e.message, 'error');
    }
  }
};
