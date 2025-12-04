const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Client } = require('pg');

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS app_migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT UNIQUE NOT NULL,
      checksum TEXT NOT NULL,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

function readMigrations(dir) {
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));
}

function checksum(contents) {
  return crypto.createHash('sha256').update(contents).digest('hex');
}

async function run() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not defined. Create one in your .env file.');
  }

  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Migrations directory not found: ${migrationsDir}`);
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  await client.connect();
  await ensureMigrationsTable(client);

  const applied = new Map();
  const existing = await client.query('SELECT filename, checksum FROM app_migrations');
  existing.rows.forEach((row) => applied.set(row.filename, row.checksum));

  const files = readMigrations(migrationsDir);
  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');
    const fileChecksum = checksum(sql);

    if (applied.get(file) === fileChecksum) {
      continue;
    }

    console.log(`\nApplying migration: ${file}`);
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query(
        `INSERT INTO app_migrations (filename, checksum)
         VALUES ($1, $2)
         ON CONFLICT (filename)
         DO UPDATE SET checksum = EXCLUDED.checksum, executed_at = NOW()`,
        [file, fileChecksum]
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Failed on migration ${file}`);
      throw error;
    }
  }

  await client.end();
  console.log('\nDatabase is up to date.');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
