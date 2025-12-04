const { Pool } = require('pg');

const connectionString = 'postgresql://postgres:pickitup@192.168.18.27:5433/responwarga_prod';
const pool = new Pool({ connectionString });

async function inspect() {
    const client = await pool.connect();
    try {
        console.log('Connected successfully!');

        console.log('--- Profiles Columns Types ---');
        const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'profiles'
    `);
        res.rows.forEach(r => console.log(`${r.column_name}: ${r.data_type}`));

    } catch (e) {
        console.error('Error:', e);
    } finally {
        client.release();
        pool.end();
    }
}
inspect();
