// ==============================================================================
// MediCloud Backup and Recovery Routes (Administrator Only)
// ==============================================================================

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');
const BackupService = require('../utils/backupService');

const router = express.Router();
router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /api/backup
 * List recorded backups and filesystem status
 */
router.get('/', (req, res) => {
  try {
    const backups = BackupService.listBackups();
    const specs = BackupService.getDisasterRecoverySpecs();
    return res.json({
      backups,
      specs,
      backupStorageDirectory: 'Protected internal server volume (outside public web directory)'
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/backup
 * Trigger a new manual snapshot backup with cryptographic SHA-256 checksum
 */
router.post('/', (req, res) => {
  try {
    const backupResult = BackupService.createBackup(req.user);
    return res.status(201).json({
      message: 'Cryptographic snapshot backup created successfully',
      backup: backupResult
    });
  } catch (err) {
    return res.status(500).json({ error: `Backup failed: ${err.message}` });
  }
});

/**
 * POST /api/backup/:id/verify
 * Perform SHA-256 cryptographic integrity verification
 */
router.post('/:id/verify', (req, res) => {
  const backupId = parseInt(req.params.id, 10);
  if (isNaN(backupId)) {
    return res.status(400).json({ error: 'Invalid backup ID' });
  }

  try {
    const result = BackupService.verifyBackup(backupId);
    return res.json({
      message: result.status === 'VERIFIED' ? 'Integrity check passed' : 'Integrity check failed',
      verification: result
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/backup/:id/restore
 * Test database restoration with mandatory pre-restore safeguard snapshot
 */
router.post('/:id/restore', (req, res) => {
  const backupId = parseInt(req.params.id, 10);
  if (isNaN(backupId)) {
    return res.status(400).json({ error: 'Invalid backup ID' });
  }

  try {
    const result = BackupService.restoreBackup(backupId, req.user);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: `Restoration failed: ${err.message}` });
  }
});

/**
 * GET /api/backup/specs
 * Retrieve disaster recovery and business continuity specifications
 */
router.get('/specs', (req, res) => {
  return res.json(BackupService.getDisasterRecoverySpecs());
});

module.exports = router;
