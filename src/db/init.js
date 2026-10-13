// ==============================================================================
// Database Schema Initialization Routine
// ==============================================================================

const fs = require('fs');
const path = require('path');
const db = require('./index');

function initDatabase() {
  const schemaPath = path.resolve(__dirname, '../../database/schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  // Execute schema DDL
  db.exec(schemaSql);
  return true;
}

module.exports = { initDatabase };
