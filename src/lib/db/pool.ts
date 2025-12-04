import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg'

let connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined. Please set it in your environment before starting the app.')
}

// Remove sslmode=require to prevent forced SSL
// We force disable SSL here because the local server does not support it,
// even if DB_SSL is set to true in .env
connectionString = connectionString.replace(/(\?|&)sslmode=require/, '');

const pool = new Pool({
  connectionString,
  ssl: false,
})

export type DbClient = PoolClient

export async function getClient() {
  return pool.connect()
}

export async function query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  return pool.query<T>(text, params)
}

export async function withClient<T>(handler: (client: DbClient) => Promise<T>): Promise<T> {
  const client = await getClient()
  try {
    return await handler(client)
  } finally {
    client.release()
  }
}

export async function withTransaction<T>(handler: (client: DbClient) => Promise<T>): Promise<T> {
  return withClient(async (client) => {
    await client.query('BEGIN')
    try {
      const result = await handler(client)
      await client.query('COMMIT')
      return result
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    }
  })
}

export interface DbSessionContext {
  userId?: string | null
  role?: string | null
}

export async function applySessionContext(client: DbClient, context?: DbSessionContext) {
  const statements: Array<{ key: string; value: string | null }> = [
    { key: 'app.current_user_id', value: context?.userId ?? null },
    { key: 'app.current_user_role', value: context?.role ?? null },
  ]

  for (const stmt of statements) {
    if (stmt.value) {
      await client.query('SELECT set_config($1, $2, false)', [stmt.key, stmt.value])
    } else {
      await client.query("SELECT set_config($1, '', false)", [stmt.key])
    }
  }
}
