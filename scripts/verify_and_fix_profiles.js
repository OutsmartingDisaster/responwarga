const { Pool } = require('pg');

const connectionString = 'postgresql://postgres:pickitup@192.168.18.27:5433/responwarga_prod';
const pool = new Pool({ connectionString });

async function verifyAndFix() {
    const client = await pool.connect();
    try {
        console.log('--- Current Profiles Data ---');
        const res = await client.query('SELECT user_id, name, username, phone, status FROM profiles');
        console.table(res.rows);

        console.log('--- Backfilling missing data ---');
        // Update username from name if null
        await client.query(`
      UPDATE profiles 
      SET username = LOWER(REPLACE(name, ' ', '_')),
          status = 'active',
          phone = '08123456789'
      WHERE username IS NULL
    `);

        console.log('--- Updated Profiles Data ---');
        const updated = await client.query('SELECT user_id, name, username, phone, status FROM profiles');
        console.table(updated.rows);

    } catch (e) {
        console.error('Error:', e);
    } finally {
        client.release();
        pool.end();
    }
}
verifyAndFix();
