const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('Usage: node scripts/run-migration.js <migration-file>');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:pickitup@192.168.18.27:5433/responwarga_prod',
  ssl: false
});

async function run() {
  const filePath = path.resolve(migrationFile);
  console.log(`Running migration: ${filePath}`);
  
  const sqlContent = fs.readFileSync(filePath, 'utf8');
  const sql = `SET search_path TO public, auth;\n${sqlContent}`;
  
  try {
    await pool.query(sql);
    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
