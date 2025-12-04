const { Pool } = require('pg');

const connectionString = 'postgresql://postgres:pickitup@192.168.18.27:5433/responwarga_prod';
const pool = new Pool({ connectionString });

async function inspect() {
    const client = await pool.connect();
    try {
        console.log('Connected successfully!');

        console.log('--- Organizations ---');
        const orgs = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'organizations'");
        console.log(orgs.rows.map(r => r.column_name));

        console.log('--- Auth Users ---');
        const users = await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users'");
        console.log(users.rows.map(r => r.column_name));

        console.log('--- Profiles ---');
        const profiles = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles'");
        console.log(profiles.rows.map(r => r.column_name));

    } catch (e) {
        console.error('Error:', e);
    } finally {
        client.release();
        pool.end();
    }
}
inspect();
