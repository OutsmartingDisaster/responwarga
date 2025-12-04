const { Pool } = require('pg');

const connectionString = 'postgresql://postgres:pickitup@192.168.18.27:5433/responwarga_prod';
const pool = new Pool({ connectionString });

async function inspect() {
    const client = await pool.connect();
    try {
        console.log('Connected successfully!');

        console.log('--- Tables in auth schema ---');
        const authTables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'auth'");
        console.log(authTables.rows.map(r => r.table_name));

        console.log('--- Tables in public schema ---');
        const publicTables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log(publicTables.rows.map(r => r.table_name));

    } catch (e) {
        console.error('Error:', e);
    } finally {
        client.release();
        pool.end();
    }
}
inspect();
