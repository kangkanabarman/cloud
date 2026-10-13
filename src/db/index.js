// ==============================================================================
// MediCloud Database Access Layer (Modular SQLite / RDS Ready)
// ==============================================================================

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const config = require('../config');

let dbInstance = null;

function getDb() {
  if (!dbInstance) {
    const dbDir = path.dirname(config.db.path);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    dbInstance = new DatabaseSync(config.db.path);
    // Enable WAL mode & foreign keys for concurrency and integrity
    dbInstance.exec('PRAGMA journal_mode = WAL;');
    dbInstance.exec('PRAGMA foreign_keys = ON;');
  }
  return dbInstance;
}

// Parameterized Query: Returns array of rows
function query(sql, params = []) {
  const db = getDb();
  const stmt = db.prepare(sql);
  const rows = stmt.all(...params);
  // Ensure returned rows are standard plain JavaScript objects
  return rows.map(row => ({ ...row }));
}

// Parameterized Query: Returns single row or null
function get(sql, params = []) {
  const db = getDb();
  const stmt = db.prepare(sql);
  const row = stmt.get(...params);
  return row ? { ...row } : null;
}

// Parameterized Execution: Insert, Update, Delete
function run(sql, params = []) {
  const db = getDb();
  const stmt = db.prepare(sql);
  const result = stmt.run(...params);
  return {
    changes: result.changes,
    lastInsertRowid: Number(result.lastInsertRowid)
  };
}

// Execute Raw SQL (for migrations and schema loading)
function exec(sql) {
  const db = getDb();
  return db.exec(sql);
}

// Transaction wrapper
function transaction(fn) {
  const db = getDb();
  db.exec('BEGIN TRANSACTION;');
  try {
    const result = fn();
    db.exec('COMMIT;');
    return result;
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

function close() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

module.exports = {
  getDb,
  query,
  get,
  run,
  exec,
  transaction,
  close
};
