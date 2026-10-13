// ==============================================================================
// MediCloud Configuration Module
// ==============================================================================

const path = require('path');
require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT, 10) || 3000,
  appName: process.env.APP_NAME || 'MediCloud — Hospital Management System',
  baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`,

  // Session Security Configuration
  session: {
    secret: process.env.SESSION_SECRET || 'medicloud_academic_dev_secret_key_8923748923749283749',
    maxAge: parseInt(process.env.SESSION_MAX_AGE_MS, 10) || 24 * 60 * 60 * 1000, // 24 hours
    name: 'medicloud.sid',
    sameSite: process.env.SESSION_SAMESITE || (process.env.CROSS_ORIGIN === 'true' ? 'none' : 'lax'),
    secure: process.env.COOKIE_SECURE !== undefined
      ? process.env.COOKIE_SECURE === 'true'
      : process.env.NODE_ENV === 'production'
  },

  // Database Configuration
  db: {
    type: process.env.DATABASE_TYPE || 'sqlite',
    path: path.resolve(
      process.cwd(),
      process.env.DATABASE_PATH || (process.env.VERCEL ? '/tmp/medicloud.sqlite' : './database/medicloud.sqlite')
    ),
    backupDir: path.resolve(
      process.cwd(),
      process.env.BACKUP_DIRECTORY || (process.env.VERCEL ? '/tmp/backups' : './data/backups')
    )
  },

  // Proposed AWS Cloud Architecture Metadata (Academic Prototype Context)
  cloud: {
    targetRdsHost: process.env.RDS_DB_HOST || 'rds-mysql-cluster.medicloud.internal',
    targetRegion: process.env.AWS_REGION || 'us-east-1',
    targetS3Bucket: process.env.S3_BUCKET_NAME || 'medicloud-attachments-vault-encrypted',
    isCloudDeployed: false // Explicit academic honesty flag
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 mins
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 150,
    authMaxAttempts: parseInt(process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS, 10) || 10
  }
};

module.exports = config;
