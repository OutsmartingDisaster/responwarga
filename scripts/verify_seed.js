const { Pool } = require('pg');

const connectionString = 'postgresql://postgres:pickitup@192.168.18.27:5433/responwarga_prod';
const pool = new Pool({ connectionString });

async function verify() {
    const client = await pool.connect();
    try {
        console.log('--- Users ---');
        const users = await client.query('SELECT email, role FROM auth.users');
        console.table(users.rows);

        console.log('--- Profiles ---');
        const profiles = await client.query('SELECT p.name, p.role, o.name as org_name FROM profiles p LEFT JOIN organizations o ON p.organization_id = o.id');
        console.table(profiles.rows);

    } catch (e) {
        console.error('Error:', e);
    } finally {
        client.release();
        pool.end();
    }
}
verify();
