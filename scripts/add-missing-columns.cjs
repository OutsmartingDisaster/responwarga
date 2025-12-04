const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
});

async function addColumns() {
    await client.connect();
    try {
        console.log("Adding missing columns...");

        // Add disaster_types
        await client.query(`
      ALTER TABLE disaster_responses 
      ADD COLUMN IF NOT EXISTS disaster_types text[] DEFAULT '{}';
    `);
        console.log("Added disaster_types");

        // Add latitude
        await client.query(`
      ALTER TABLE disaster_responses 
      ADD COLUMN IF NOT EXISTS latitude float8;
    `);
        console.log("Added latitude");

        // Add longitude
        await client.query(`
      ALTER TABLE disaster_responses 
      ADD COLUMN IF NOT EXISTS longitude float8;
    `);
        console.log("Added longitude");

        // Add location if missing (it should exist but just in case)
        await client.query(`
      ALTER TABLE disaster_responses 
      ADD COLUMN IF NOT EXISTS location text;
    `);
        console.log("Added location");

        // Add start_date
        await client.query(`
      ALTER TABLE disaster_responses 
      ADD COLUMN IF NOT EXISTS start_date timestamptz DEFAULT NOW();
    `);
        console.log("Added start_date");

    } catch (err) {
        console.error('Error adding columns:', err);
    } finally {
        await client.end();
    }
}

addColumns();
