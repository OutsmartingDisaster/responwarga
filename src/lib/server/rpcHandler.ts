import type { DbClient } from '@/lib/db/pool'
import type { QueryRequest, QueryResponse } from '@/lib/data/types'
import { quoteIdentifier } from './queryUtils'

const ALLOWED_FUNCTIONS = new Set([
  'assign_emergency_report',
  'request_cancellation',
  'get_contributions_within_radius',
  'get_reports_within_radius',
  'get_all_users_with_profiles',
])

export async function runRpc<T>(client: DbClient, payload: Extract<QueryRequest, { action: 'rpc' }>): Promise<QueryResponse<T>> {
  if (!ALLOWED_FUNCTIONS.has(payload.functionName)) {
    return { data: null, error: { message: `Function ${payload.functionName} is not allowed.` } }
  }

  const args = Object.entries(payload.args ?? {})
  const sqlArgs = args
    .map(([key], index) => `${key} := $${index + 1}`)
    .join(', ')

  const sql = args.length
    ? `SELECT * FROM ${quoteIdentifier(payload.functionName)}(${sqlArgs})`
    : `SELECT * FROM ${quoteIdentifier(payload.functionName)}()`

  const result = await client.query(sql, args.map(([, value]) => value))
  return { data: result.rows as T[], error: null }
}

export { ALLOWED_FUNCTIONS }