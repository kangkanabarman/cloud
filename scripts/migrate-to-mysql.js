// ==============================================================================
// MediCloud SQLite to Amazon RDS for MySQL Migration Utility
// Exports current SQLite state to MySQL 8.0 compliant DDL & INSERT statements
// Run via: npm run migrate:mysql
// ==============================================================================

const fs = require('fs');
const path = require('path');
const db = require('../src/db');
const config = require('../src/config');

console.log('🔄 Initiating SQLite to Amazon RDS for MySQL Migration Generator...');

try {
  const schemaPath = path.resolve(__dirname, '../database/schema_mysql.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  const dumpPath = path.resolve(__dirname, '../database/mysql_dump.sql');
  const dumpStream = fs.createWriteStream(dumpPath, { encoding: 'utf8' });

  dumpStream.write('-- ==============================================================================\n');
  dumpStream.write('-- MediCloud Database Export for Amazon RDS for MySQL 8.0\n');
  dumpStream.write(`-- Generated on: ${new Date().toISOString()}\n`);
  dumpStream.write('-- Target Environment: AWS Elastic Beanstalk + Multi-AZ Amazon RDS\n');
  dumpStream.write('-- ==============================================================================\n\n');

  dumpStream.write(schemaSql);
  dumpStream.write('\n\n-- DATA MIGRATION INSERTS --\n\n');

  const escapeSql = val => {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'number') return val;
    return `'${String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  };

  const tables = ['users', 'doctors', 'patients', 'appointments', 'medical_records', 'audit_logs', 'backup_metadata'];

  for (const table of tables) {
    const rows = db.query(`SELECT * FROM ${table}`);
    console.log(`📦 Processing table [${table}] (${rows.length} records)...`);

    if (rows.length > 0) {
      dumpStream.write(`-- Table: ${table}\n`);
      for (const row of rows) {
        const columns = Object.keys(row).join(', ');
        const values = Object.values(row).map(escapeSql).join(', ');
        dumpStream.write(`INSERT INTO ${table} (${columns}) VALUES (${values});\n`);
      }
      dumpStream.write('\n');
    }
  }

  dumpStream.end();
  console.log(`✅ MySQL RDS migration script successfully generated:`);
  console.log(`   ${dumpPath}`);
  console.log(`ℹ️  To import into Amazon RDS for MySQL:`);
  console.log(`   mysql -h ${config.cloud.targetRdsHost} -u admin -p medicloud_db < database/mysql_dump.sql`);
} catch (err) {
  console.error('❌ Migration generator failed:', err);
  process.exit(1);
}
