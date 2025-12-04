const { Pool } = require('pg');

const connectionString = 'postgresql://postgres:pickitup@192.168.18.27:5433/responwarga_prod';
const pool = new Pool({ connectionString });

async function inspect() {
    const client = await pool.connect();
    try {
        const res = await client.query('SELECT id, name FROM organizations LIMIT 1');
        if (res.rows.length > 0) {
            console.log('Found organization:', res.rows[0]);
        } else {
            console.log('No organizations found.');
        }
    } catch (e) {
        console.error('Error:', e);
    } finally {
        client.release();
        pool.end();
    }
}
inspect();
