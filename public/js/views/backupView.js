// ==============================================================================
// MediCloud Backup and Disaster Recovery View (Administrator Only)
// ==============================================================================

const BackupView = {
  async render(container) {
    if (Auth.user.role !== 'ADMIN') {
      container.innerHTML = `
        <div class="denied-card">
          <div class="denied-icon">💾</div>
          <h3>HTTP 403 Forbidden — Disaster Recovery Module</h3>
          <p>
            Database backup triggers, checksum verification, and restore routines require <strong>ADMINISTRATOR</strong> authority.
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
        <p style="margin-top: 10px; color: var(--color-text-muted);">Loading backup catalog and disaster recovery telemetry...</p>
      </div>
    `;

    await this.loadBackups(container);
  },

  async loadBackups(container) {
    try {
      const res = await API.get('/api/backup');
      const backups = res.backups || [];
      const specs = res.specs || {};

      container.innerHTML = `
        <!-- Top Action Card -->
        <div class="card" style="margin-bottom: 20px; padding: 18px 24px;">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
            <div>
              <h3 style="font-size: 1.05rem; color: var(--color-navy-primary);">
                💾 Database Backup & Cryptographic Integrity Catalog
              </h3>
              <p style="font-size: 0.8rem; margin: 0; color: var(--color-text-muted);">
                Stored in private server volume: <code>${res.backupStorageDirectory}</code>
              </p>
            </div>
            <div>
              <button class="btn btn-primary" onclick="BackupView.triggerManualBackup()">
                ⚡ Trigger Live Snapshot Backup
              </button>
            </div>
          </div>
        </div>

        <!-- Backups List Table -->
        <div class="card" style="padding: 0; overflow: hidden; margin-bottom: 24px;">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Backup Snapshot File</th>
                  <th>Size</th>
                  <th>SHA-256 Cryptographic Checksum</th>
                  <th>Created On</th>
                  <th>Disk Status</th>
                  <th>Integrity</th>
                  <th style="text-align: right;">Operations</th>
                </tr>
              </thead>
              <tbody>
                ${backups.length === 0 ? `
                  <tr>
                    <td colspan="7" style="text-align: center; padding: 36px; color: var(--color-text-muted);">
                      No manual snapshots recorded yet. Click 'Trigger Live Snapshot Backup' above.
                    </td>
                  </tr>
                ` : backups.map(b => `
                  <tr>
                    <td><strong>${b.backup_filename}</strong></td>
                    <td>${(b.file_size_bytes / 1024).toFixed(1)} KB</td>
                    <td>
                      <code style="font-size: 0.72rem; color: var(--color-teal-dark); background: #f0fdfa; padding: 2px 6px; border-radius: 4px;">
                        ${b.checksum_sha256.slice(0, 16)}...${b.checksum_sha256.slice(-8)}
                      </code>
                    </td>
                    <td style="font-size: 0.8rem; color: var(--color-text-secondary);">${b.created_at}</td>
                    <td>
                      <span class="badge ${b.existsOnDisk ? 'badge-success' : 'badge-danger'}">
                        ${b.existsOnDisk ? 'On Disk' : 'Missing'}
                      </span>
                    </td>
                    <td>
                      <span class="badge ${b.status === 'VERIFIED' ? 'badge-success' : 'badge-neutral'}">
                        ${b.status}
                      </span>
                    </td>
                    <td style="text-align: right;">
                      <button class="btn btn-outline btn-sm" onclick="BackupView.verifyChecksum(${b.id})">
                        Verify SHA-256
                      </button>
                      <button class="btn btn-danger btn-sm" onclick="BackupView.confirmRestore(${b.id}, '${b.backup_filename}')">
                        Restore
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Disaster Recovery Specifications Comparison Card -->
        <div class="card">
          <div class="card-header">
            <h3>🛡️ Disaster Recovery (DR) & Business Continuity Model</h3>
            <span class="badge badge-info">RPO & RTO ANALYSIS</span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; font-size: 0.85rem;">
            <!-- Left: Local Prototype -->
            <div style="background: var(--color-surface-muted); padding: 20px; border-radius: var(--radius-md); border: 1px solid var(--color-border);">
              <h4 style="color: var(--color-navy-primary); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                💻 Local Implementation (Active Prototype)
              </h4>
              <ul style="list-style: none; line-height: 1.8; color: var(--color-text-secondary);">
                <li><strong>Database Engine:</strong> SQLite 3 with Write-Ahead Logging (WAL)</li>
                <li><strong>Backup Strategy:</strong> Cryptographic file snapshots via safe checkpointing</li>
                <li><strong>Integrity Verification:</strong> SHA-256 cryptographic hashing</li>
                <li><strong>Safeguard Protection:</strong> Pre-restore safeguard snapshot created before restore</li>
                <li><strong>Estimated RPO (Recovery Point Objective):</strong> ~0s for on-demand snapshots</li>
                <li><strong>Estimated RTO (Recovery Time Objective):</strong> &lt; 3 minutes local file swap</li>
              </ul>
            </div>

            <!-- Right: Target AWS RDS Architecture -->
            <div style="background: #f0fdfa; padding: 20px; border-radius: var(--radius-md); border: 1px solid var(--color-teal-light);">
              <h4 style="color: var(--color-teal-dark); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                ☁️ Target Production Architecture (Amazon RDS)
              </h4>
              <ul style="list-style: none; line-height: 1.8; color: var(--color-text-secondary);">
                <li><strong>Database Engine:</strong> Amazon RDS for MySQL 8.0 Multi-AZ</li>
                <li><strong>Automated Backups:</strong> Enabled with 35-day retention period</li>
                <li><strong>Point-in-Time Recovery:</strong> Granular second-by-second restoration (PITR)</li>
                <li><strong>Secondary Vault:</strong> Amazon S3 with SSE-KMS & Object Lock</li>
                <li><strong>Target RPO:</strong> &lt; 5 minutes (continuous transaction log synchronization)</li>
                <li><strong>Target RTO:</strong> &lt; 15 minutes (automatic Multi-AZ failover in 60-120s)</li>
              </ul>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `
        <div class="card" style="text-align: center; color: var(--color-danger); padding: 40px;">
          <h3>Error loading backup services</h3>
          <p>${err.message}</p>
        </div>
      `;
    }
  },

  async triggerManualBackup() {
    try {
      showToast('Creating cryptographic snapshot...', 'info');
      const res = await API.post('/api/backup', {});
      showToast(`Snapshot ${res.backup.backupFilename} created successfully!`, 'success');
      this.loadBackups(document.getElementById('app-content'));
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  async verifyChecksum(backupId) {
    try {
      showToast('Verifying SHA-256 checksum...', 'info');
      const res = await API.post(`/api/backup/${backupId}/verify`, {});
      if (res.verification.status === 'VERIFIED') {
        showToast('Cryptographic integrity confirmed: SHA-256 match!', 'success');
      } else {
        showToast('Integrity error: Checksum mismatch!', 'error');
      }
      this.loadBackups(document.getElementById('app-content'));
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  confirmRestore(backupId, filename) {
    openGenericModal(
      'Confirm Safe Database Restoration',
      `
        <div style="font-size: 0.88rem;">
          <div style="padding: 12px; background: var(--color-warning-soft); border-left: 4px solid var(--color-warning); border-radius: var(--radius-sm); margin-bottom: 16px;">
            <strong>Mandatory Pre-Restore Safeguard:</strong><br>
            The system will automatically snapshot the active database into a safeguard file prior to restoration. If the backup SHA-256 checksum fails, the restore operation will abort automatically.
          </div>
          <p>Are you sure you wish to restore from snapshot: <strong>${filename}</strong>?</p>
        </div>
      `,
      `
        <button class="btn btn-outline" onclick="closeGenericModal()">Cancel</button>
        <button class="btn btn-danger" onclick="BackupView.executeRestore(${backupId})">Confirm & Restore</button>
      `
    );
  },

  async executeRestore(backupId) {
    try {
      closeGenericModal();
      showToast('Restoring database with safeguard...', 'info');
      const res = await API.post(`/api/backup/${backupId}/restore`, {});
      showToast(res.message, 'success');
      this.loadBackups(document.getElementById('app-content'));
    } catch (e) {
      showToast(e.message, 'error');
    }
  }
};
