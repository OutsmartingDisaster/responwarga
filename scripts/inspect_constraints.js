const { Pool } = require('pg');

const connectionString = 'postgresql://postgres:pickitup@192.168.18.27:5433/responwarga_prod';
const pool = new Pool({ connectionString });

async function inspect() {
    const client = await pool.connect();
    try {
        console.log('--- Profiles Constraints ---');
        const res = await client.query(`
      SELECT conname, pg_get_constraintdef(c.oid)
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE n.nspname = 'public' AND c.conrelid::regclass::text = 'profiles'
    `);
        res.rows.forEach(r => console.log(`${r.conname}: ${r.pg_get_constraintdef}`));

        console.log('--- Profiles Indexes ---');
        const indexes = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'profiles'
    `);
        indexes.rows.forEach(r => console.log(`${r.indexname}: ${r.indexdef}`));

    } catch (e) {
        console.error('Error:', e);
    } finally {
        client.release();
        pool.end();
    }
}
inspect();
