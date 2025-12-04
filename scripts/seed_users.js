const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const connectionString = 'postgresql://postgres:pickitup@192.168.18.27:5433/responwarga_prod';
const pool = new Pool({ connectionString });

async function seed() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Create auth schema and users table
        console.log('Creating auth schema and users table...');
        await client.query(`CREATE SCHEMA IF NOT EXISTS auth`);
        await client.query(`
      CREATE TABLE IF NOT EXISTS auth.users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

        // 2. Create Organization
        console.log('Creating organization...');
        let orgId;
        const orgRes = await client.query(`SELECT id FROM organizations WHERE name = 'BPBD DKI Jakarta'`);
        if (orgRes.rows.length > 0) {
            orgId = orgRes.rows[0].id;
        } else {
            const insertOrg = await client.query(`
        INSERT INTO organizations (id, name, slug, type, email)
        VALUES (gen_random_uuid(), 'BPBD DKI Jakarta', 'bpbd-dki', 'government', 'bpbd@jakarta.go.id')
        RETURNING id
      `);
            orgId = insertOrg.rows[0].id;
        }
        console.log('Organization ID:', orgId);

        // 3. Create Users
        const passwordHash = await bcrypt.hash('password123', 12);

        const users = [
            { email: 'admin@example.com', role: 'admin', name: 'System Admin' },
            { email: 'org_admin@example.com', role: 'org_admin', name: 'Org Admin', orgId: orgId },
            { email: 'responder@example.com', role: 'org_responder', name: 'Field Responder', orgId: orgId },
            { email: 'public@example.com', role: 'public', name: 'Public User' }
        ];

        for (const user of users) {
            console.log(`Creating user ${user.email}...`);

            // Check if user exists
            const userCheck = await client.query(`SELECT id FROM auth.users WHERE email = $1`, [user.email]);
            let userId;

            if (userCheck.rows.length > 0) {
                userId = userCheck.rows[0].id;
                await client.query(`
          UPDATE auth.users SET password_hash = $2, role = $3 WHERE id = $1
        `, [userId, passwordHash, user.role]);
            } else {
                const insertUser = await client.query(`
          INSERT INTO auth.users (email, password_hash, role)
          VALUES ($1, $2, $3)
          RETURNING id
        `, [user.email, passwordHash, user.role]);
                userId = insertUser.rows[0].id;
            }

            // Create/Update Profile
            const profileCheck = await client.query(`SELECT id FROM profiles WHERE user_id = $1`, [userId]);
            if (profileCheck.rows.length > 0) {
                await client.query(`
          UPDATE profiles 
          SET name = $2, role = $3, organization_id = $4
          WHERE user_id = $1
        `, [userId, user.name, user.role, user.orgId || null]);
            } else {
                await client.query(`
          INSERT INTO profiles (id, user_id, name, role, organization_id)
          VALUES (gen_random_uuid(), $1, $2, $3, $4)
        `, [userId, user.name, user.role, user.orgId || null]);
            }
        }

        await client.query('COMMIT');
        console.log('Seeding completed successfully!');

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Error seeding users:', e);
    } finally {
        client.release();
        pool.end();
    }
}

seed();
