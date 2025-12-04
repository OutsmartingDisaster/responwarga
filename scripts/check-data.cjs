const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
});

async function checkData() {
    await client.connect();
    try {
        const res = await client.query('SELECT COUNT(*) FROM disaster_responses');
        console.log('Disaster Responses Count:', res.rows[0].count);
    } catch (err) {
        console.error('Error querying database:', err);
    } finally {
        await client.end();
    }
}

checkData();
