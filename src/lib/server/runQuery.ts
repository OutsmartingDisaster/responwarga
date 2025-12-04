import { ALLOWED_TABLES } from '@/lib/data/allowedTables'
import type { DbSessionContext } from '@/lib/db/pool'
import { applySessionContext, withClient } from '@/lib/db/pool'
import type { QueryRequest, QueryResponse, TableQueryPayload } from '@/lib/data/types'
import { ALLOWED_FUNCTIONS } from './rpcHandler'

// Import the functions from the new modules
import { runSelect, runInsert, runUpdate, runDelete } from './queryBuilder'
import { runRpc } from './rpcHandler'

export async function runQuery<T = unknown>(payload: QueryRequest, context?: DbSessionContext): Promise<QueryResponse<T>> {
  try {
    return await withClient(async (client) => {
      await applySessionContext(client, context)

      if (payload.action === 'rpc') {
        return runRpc<T>(client, payload)
      }

      if (!ALLOWED_TABLES.has(payload.table)) {
        return {
          data: null,
          error: { message: `Table ${payload.table} is not available through the RPC gateway.` },
        }
      }

      switch (payload.action) {
        case 'select':
          return runSelect<T>(client, payload as TableQueryPayload & { action: 'select' })
        case 'insert':
          return runInsert<T>(client, payload as TableQueryPayload & { action: 'insert' })
        case 'update':
          return runUpdate<T>(client, payload as TableQueryPayload & { action: 'update' })
        case 'delete':
          return runDelete<T>(client, payload as TableQueryPayload & { action: 'delete' })
        default:
          return { data: null, error: { message: `Unsupported action: ${(payload as any).action}` } }
      }
    })
  } catch (error: any) {
    console.error('[runQuery] failed', error)
    return { data: null, error: { message: 'Database query failed', details: error.message } }
  }
}
