// ==============================================================================
// Database Initialization CLI Script
// Run via: npm run init-db
// ==============================================================================

const { initDatabase } = require('../src/db/init');
const { seedDatabase } = require('../src/db/seed');

console.log('🚀 Initializing MediCloud SQLite Database...');
try {
  initDatabase();
  console.log('✅ Database schema loaded successfully.');

  const seeded = seedDatabase();
  if (seeded) {
    console.log('✅ Fictional development seed data created successfully:');
    console.log('   - Admin: admin@medicloud.local / AdminPassword123!');
    console.log('   - Doctor 1: dr.chen@medicloud.local / DoctorPassword123!');
    console.log('   - Doctor 2: dr.patel@medicloud.local / DoctorPassword123!');
    console.log('   - Receptionist: receptionist@medicloud.local / ReceptionPassword123!');
  } else {
    console.log('ℹ️  Database already contained existing records, skipping duplicate seeding.');
  }
} catch (err) {
  console.error('❌ Database initialization error:', err);
  process.exit(1);
}
