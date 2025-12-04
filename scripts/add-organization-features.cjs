const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function migrate() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Add columns to organizations table
    await client.query(`
      ALTER TABLE organizations 
      ADD COLUMN IF NOT EXISTS logo_url TEXT,
      ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    `);
    console.log('✅ Updated organizations table');

    // Create team_activity_logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS team_activity_logs (
        id SERIAL PRIMARY KEY,
        organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
        user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
        action TEXT NOT NULL,
        details JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Created team_activity_logs table');

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_team_activity_org ON team_activity_logs(organization_id);
      CREATE INDEX IF NOT EXISTS idx_team_activity_user ON team_activity_logs(user_id);
    `);
    console.log('✅ Created indexes');

    console.log('\n✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
