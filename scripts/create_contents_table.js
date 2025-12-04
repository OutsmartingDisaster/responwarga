const { Pool } = require('pg');

const connectionString = 'postgresql://postgres:pickitup@192.168.18.27:5433/responwarga_prod';
const pool = new Pool({ connectionString });

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('Creating contents table...');
        await client.query('BEGIN');

        await client.query(`
      CREATE TABLE IF NOT EXISTS contents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        content TEXT,
        status TEXT DEFAULT 'draft',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
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
