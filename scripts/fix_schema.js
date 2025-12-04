const { Pool } = require('pg');

const connectionString = 'postgresql://postgres:pickitup@192.168.18.27:5433/responwarga_prod';
const pool = new Pool({ connectionString });

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('Adding missing columns to profiles table...');
        await client.query('BEGIN');

        await client.query(`
      ALTER TABLE profiles 
      ADD COLUMN IF NOT EXISTS username TEXT,
      ADD COLUMN IF NOT EXISTS phone TEXT,
      ADD COLUMN IF NOT EXISTS status TEXT
    `);

        // Also check if auth.sessions table exists, as it's used in createSession
        console.log('Checking auth.sessions table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS auth.sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        token_hash TEXT NOT NULL,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL,
        revoked_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

        await client.query('COMMIT');
        console.log('Migration completed successfully!');

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Error migrating:', e);
    } finally {
        client.release();
        pool.end();
    }
}
migrate();
