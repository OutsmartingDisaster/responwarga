const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
});

async function seedData() {
    await client.connect();
    try {
        // 1. Get Organization ID (assuming 'bpbd-jakarta-utara' exists or get the first one)
        const orgRes = await client.query("SELECT id FROM organizations LIMIT 1");
        if (orgRes.rows.length === 0) {
            console.log("No organization found. Please create one first.");
            return;
        }
        const orgId = orgRes.rows[0].id;
        console.log("Using Organization ID:", orgId);

        // 2. Insert Sample Disaster Responses
        const responses = [
            {
                name: "Banjir Kelapa Gading",
                location: "Jl. Boulevard Raya, Kelapa Gading",
                disaster_types: ["Banjir"],
                status: "active",
                urgency: "HIGH",
                description: "Banjir setinggi 50cm, akses jalan terputus.",
                latitude: -6.1623,
                longitude: 106.9004,
                affected_count: 150,
                start_date: new Date().toISOString()
            },
            {
                name: "Kebakaran Sunter",
                location: "Jl. Danau Sunter Utara",
                disaster_types: ["Kebakaran"],
                status: "active",
                urgency: "CRITICAL",
                description: "Kebakaran pemukiman padat penduduk.",
                latitude: -6.1384,
                longitude: 106.8637,
                affected_count: 45,
                start_date: new Date().toISOString()
            },
            {
                name: "Pohon Tumbang Ancol",
                location: "Jl. Lodan Raya, Ancol",
                disaster_types: ["Lainnya"],
                status: "finished",
                urgency: "MEDIUM",
                description: "Pohon tumbang menghalangi jalan.",
                latitude: -6.1265,
                longitude: 106.8335,
                affected_count: 0,
                start_date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
                completed_at: new Date().toISOString()
            }
        ];

        for (const r of responses) {
            await client.query(`
        INSERT INTO disaster_responses 
        (organization_id, name, location, disaster_types, status, urgency, description, latitude, longitude, affected_count, start_date, completed_at, type)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [orgId, r.name, r.location, r.disaster_types, r.status, r.urgency, r.description, r.latitude, r.longitude, r.affected_count, r.start_date, r.completed_at, r.disaster_types[0]]);
        }

        console.log(`Seeded ${responses.length} disaster responses.`);

    } catch (err) {
        console.error('Error seeding data:', err);
    } finally {
        await client.end();
    }
}

seedData();
