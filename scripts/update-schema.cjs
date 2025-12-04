const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });

  try {
    await client.connect();
    console.log('Connected to database.');

    // 1. Create shifts table
    console.log('Creating shifts table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS shifts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 2. Update disaster_responses table
    console.log('Updating disaster_responses table...');
    await client.query(`
      ALTER TABLE disaster_responses
      ADD COLUMN IF NOT EXISTS urgency TEXT DEFAULT 'MEDIUM',
      ADD COLUMN IF NOT EXISTS affected_count INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS description TEXT,
      ADD COLUMN IF NOT EXISTS reported_at TIMESTAMPTZ DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
    `);

    // 3. Update daily_logs table
    console.log('Updating daily_logs table...');
    await client.query(`
      ALTER TABLE daily_logs
      ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft',
      ADD COLUMN IF NOT EXISTS resources TEXT,
      ADD COLUMN IF NOT EXISTS photos TEXT[];
    `);

    console.log('Schema update complete.');
  } catch (err) {
    console.error('Error updating schema:', err);
  } finally {
    await client.end();
  }
}

run();
