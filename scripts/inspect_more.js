const { Pool } = require('pg');

const connectionString = 'postgresql://postgres:pickitup@192.168.18.27:5433/responwarga_prod';
const pool = new Pool({ connectionString });

async function inspect() {
    const client = await pool.connect();
    try {
        console.log('Connected successfully!');

        console.log('--- Schemas ---');
        const schemas = await client.query("SELECT schema_name FROM information_schema.schemata");
        console.log(schemas.rows.map(r => r.schema_name));

        console.log('--- admin_users columns ---');
        const adminUsers = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'admin_users'");
        console.log(adminUsers.rows.map(r => r.column_name));

    } catch (e) {
        console.error('Error:', e);
    } finally {
        client.release();
        pool.end();
    }
}
inspect();
