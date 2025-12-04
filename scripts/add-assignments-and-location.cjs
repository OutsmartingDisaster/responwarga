/**
 * Migration script to add:
 * 1. assignments table for task dispatch
 * 2. latitude, longitude, last_location_update columns to profiles table
 */

const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:pickitup@192.168.18.27:5433/responwarga_prod';

async function migrate() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Connected to database');

    // 1. Add location columns to profiles table
    console.log('\n--- Adding location columns to profiles ---');
    
    const profileColumns = [
      { name: 'latitude', type: 'DECIMAL(10, 8)' },
      { name: 'longitude', type: 'DECIMAL(11, 8)' },
      { name: 'last_location_update', type: 'TIMESTAMPTZ' },
    ];

    for (const col of profileColumns) {
      try {
        await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
        console.log(`✓ Added column profiles.${col.name}`);
      } catch (err) {
        if (err.code === '42701') { // column already exists
          console.log(`- Column profiles.${col.name} already exists`);
        } else {
          console.error(`✗ Error adding profiles.${col.name}:`, err.message);
        }
      }
    }

    // 2. Create assignments table
    console.log('\n--- Creating assignments table ---');
    
    const createAssignmentsTable = `
      CREATE TABLE IF NOT EXISTS assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        responder_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        disaster_response_id UUID REFERENCES disaster_responses(id) ON DELETE SET NULL,
        emergency_report_id UUID REFERENCES emergency_reports(id) ON DELETE SET NULL,
        contribution_id UUID REFERENCES contributions(id) ON DELETE SET NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'assigned',
        notes TEXT,
        assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        accepted_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    try {
      await client.query(createAssignmentsTable);
      console.log('✓ Created assignments table');
    } catch (err) {
      if (err.code === '42P07') { // table already exists
        console.log('- assignments table already exists');
      } else {
        console.error('✗ Error creating assignments table:', err.message);
      }
    }

    // 3. Create indexes for assignments table
    console.log('\n--- Creating indexes ---');
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_assignments_organization_id ON assignments(organization_id)',
      'CREATE INDEX IF NOT EXISTS idx_assignments_responder_id ON assignments(responder_id)',
      'CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status)',
      'CREATE INDEX IF NOT EXISTS idx_assignments_disaster_response_id ON assignments(disaster_response_id)',
      'CREATE INDEX IF NOT EXISTS idx_profiles_organization_status ON profiles(organization_id, status)',
    ];

    for (const indexSql of indexes) {
      try {
        await client.query(indexSql);
        console.log(`✓ Created index`);
      } catch (err) {
        console.error(`✗ Error creating index:`, err.message);
      }
    }

    // 4. Add trigger for updated_at
    console.log('\n--- Adding updated_at trigger ---');
    
    try {
      await client.query(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ language 'plpgsql';
      `);
      
      await client.query(`
        DROP TRIGGER IF EXISTS update_assignments_updated_at ON assignments;
        CREATE TRIGGER update_assignments_updated_at
          BEFORE UPDATE ON assignments
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      `);
      console.log('✓ Added updated_at trigger to assignments');
    } catch (err) {
      console.error('✗ Error adding trigger:', err.message);
    }

    console.log('\n✅ Migration completed successfully!');

    // Show table structure
    console.log('\n--- Verifying assignments table structure ---');
    const { rows } = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'assignments'
      ORDER BY ordinal_position
    `);
    console.table(rows);

    // Show profiles location columns
    console.log('\n--- Verifying profiles location columns ---');
    const { rows: profileRows } = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'profiles' AND column_name IN ('latitude', 'longitude', 'last_location_update')
      ORDER BY ordinal_position
    `);
    console.table(profileRows);

  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\nDatabase connection closed');
  }
}

migrate();
