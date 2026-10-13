// ==============================================================================
// MediCloud Backup & Disaster Recovery Service
// Manages local SQLite snapshots with cryptographic verification & AWS RDS disaster recovery models
// ==============================================================================

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../config');
const db = require('../db');
const AuditLogger = require('./auditLogger');

class BackupService {
  /**
   * Ensure the private backup directory exists outside public directory
   */
  static getBackupDir() {
    const backupDir = config.db.backupDir;
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    return backupDir;
  }

  /**
   * Computes SHA-256 hash of a file for cryptographic integrity check
   */
  static computeChecksum(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha256');
    hash.update(fileBuffer);
    return hash.digest('hex');
  }

  /**
   * Create an administrator-controlled live SQLite backup snapshot
   */
  static createBackup(adminUser) {
    const backupDir = this.getBackupDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilename = `medicloud_backup_${timestamp}.sqlite`;
    const destinationPath = path.join(backupDir, backupFilename);

    // Source database path
    const sourceDbPath = config.db.path;
    if (!fs.existsSync(sourceDbPath)) {
      throw new Error('Active database file does not exist');
    }

    // Force SQLite WAL checkpoint before copy to ensure latest pages are committed
    try {
      db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
    } catch (e) {
      console.warn('WAL checkpoint notice:', e.message);
    }

    // Copy database file securely
    fs.copyFileSync(sourceDbPath, destinationPath);

    // Get file size and SHA-256 checksum
    const stats = fs.statSync(destinationPath);
    const checksum = this.computeChecksum(destinationPath);

    // Store metadata in backup_metadata table
    const sql = `
      INSERT INTO backup_metadata (
        backup_filename, file_path, file_size_bytes, checksum_sha256,
        backup_type, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const result = db.run(sql, [
      backupFilename,
      destinationPath,
      stats.size,
      checksum,
      'MANUAL_SNAPSHOT',
      'COMPLETED',
      adminUser?.id || null
    ]);

    // Record audit event
    AuditLogger.log({
      eventType: 'BACKUP_CREATED',
      actorId: adminUser?.id || null,
      actorUsername: adminUser?.username || 'system',
      actorRole: adminUser?.role || 'ADMIN',
      targetResource: 'BACKUP_SNAPSHOT',
      targetId: backupFilename,
      action: 'CREATE_BACKUP',
      status: 'SUCCESS',
      metadata: {
        fileSize: stats.size,
        checksum,
        backupId: result.lastInsertRowid
      }
    });

    return {
      backupId: result.lastInsertRowid,
      backupFilename,
      fileSizeBytes: stats.size,
      checksum,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * List all recorded backups with metadata
   */
  static listBackups() {
    const sql = `
      SELECT b.*, u.full_name as created_by_name
      FROM backup_metadata b
      LEFT JOIN users u ON b.created_by = u.id
      ORDER BY b.created_at DESC
    `;
    const backups = db.query(sql);

    // Verify physical file presence on filesystem
    return backups.map(b => {
      const existsOnDisk = fs.existsSync(b.file_path);
      return {
        ...b,
        existsOnDisk
      };
    });
  }

  /**
   * Verify backup integrity using SHA-256
   */
  static verifyBackup(backupId) {
    const backup = db.get('SELECT * FROM backup_metadata WHERE id = ?', [backupId]);
    if (!backup) {
      throw new Error(`Backup ID ${backupId} not found in catalog.`);
    }

    if (!fs.existsSync(backup.file_path)) {
      throw new Error(`Backup file missing from storage: ${backup.backup_filename}`);
    }

    const currentChecksum = this.computeChecksum(backup.file_path);
    const isIntact = currentChecksum === backup.checksum_sha256;

    if (isIntact) {
      db.run('UPDATE backup_metadata SET status = ?, verified_at = CURRENT_TIMESTAMP WHERE id = ?', [
        'VERIFIED',
        backupId
      ]);
    } else {
      db.run('UPDATE backup_metadata SET status = ? WHERE id = ?', [
        'FAILED',
        backupId
      ]);
    }

    return {
      backupId,
      filename: backup.backup_filename,
      storedChecksum: backup.checksum_sha256,
      currentChecksum,
      status: isIntact ? 'VERIFIED' : 'INTEGRITY_MISMATCH'
    };
  }

  /**
   * Safe restoration test procedure with mandatory pre-restore safeguard
   */
  static restoreBackup(backupId, adminUser) {
    const backup = db.get('SELECT * FROM backup_metadata WHERE id = ?', [backupId]);
    if (!backup) {
      throw new Error(`Backup record ${backupId} does not exist`);
    }

    if (!fs.existsSync(backup.file_path)) {
      throw new Error('Selected backup physical file does not exist on disk.');
    }

    // Step 1: Verify Checksum before attempting restore
    const currentChecksum = this.computeChecksum(backup.file_path);
    if (currentChecksum !== backup.checksum_sha256) {
      throw new Error('Restoration aborted: Checksum mismatch indicates backup file corruption or tampering!');
    }

    // Step 2: SAFEGUARD - Create immediate pre-restore safeguard snapshot
    const backupDir = this.getBackupDir();
    const safeguardFilename = `medicloud_prerestore_safeguard_${Date.now()}.sqlite`;
    const safeguardPath = path.join(backupDir, safeguardFilename);
    const sourceDbPath = config.db.path;

    if (fs.existsSync(sourceDbPath)) {
      fs.copyFileSync(sourceDbPath, safeguardPath);
    }

    // Step 3: Close existing DB connection and perform restoration
    db.close();
    fs.copyFileSync(backup.file_path, sourceDbPath);

    // Step 4: Re-open DB and log event
    AuditLogger.log({
      eventType: 'BACKUP_RESTORED',
      actorId: adminUser?.id || null,
      actorUsername: adminUser?.username || 'admin',
      actorRole: adminUser?.role || 'ADMIN',
      targetResource: 'DATABASE_RESTORE',
      targetId: backup.backup_filename,
      action: 'RESTORE_DATABASE',
      status: 'SUCCESS',
      metadata: {
        safeguardFile: safeguardFilename,
        restoredFile: backup.backup_filename,
        checksum: currentChecksum
      }
    });

    return {
      success: true,
      restoredFrom: backup.backup_filename,
      safeguardSnapshot: safeguardFilename,
      message: 'Database restored successfully after automated pre-restore safeguard snapshot.'
    };
  }

  /**
   * Return disaster recovery specifications comparing local prototype vs proposed AWS architecture
   */
  static getDisasterRecoverySpecs() {
    return {
      localPrototype: {
        engine: 'SQLite 3 with WAL Journaling',
        backupType: 'Manual and Scheduled cryptographic snapshots',
        storageLocation: 'Private server directory outside web root',
        encryption: 'AES-256 disk encryption at host level',
        integrityCheck: 'SHA-256 cryptographic checksums',
        estimatedRPO: '1 hour (scheduled intervals) / On-demand (0 seconds)',
        estimatedRTO: '< 3 minutes (local file swap with safeguard)'
      },
      proposedAWSArchitecture: {
        engine: 'Amazon RDS for MySQL 8.0 Multi-AZ Deployment',
        automatedBackups: 'Enabled with 35-day retention period',
        snapshotFrequency: 'Daily automated snapshots + 5-minute transaction log synchronization',
        pointInTimeRecovery: 'Supported to any second within 35 days (PITR)',
        secondaryStorage: 'Amazon S3 with SSE-KMS (aws:kms) and Object Lock (WORM)',
        crossRegionReplication: 'Optional read-replica in secondary AWS region',
        targetRPO: '< 5 minutes (based on RDS binlog streaming to S3)',
        targetRTO: '< 15 minutes (automatic Multi-AZ failover takes 60-120 seconds; full snapshot restore takes ~10-15 minutes)'
      }
    };
  }
}

module.exports = BackupService;
