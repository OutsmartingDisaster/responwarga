export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'like'
  | 'ilike'
  | 'in'
  | 'is'

export interface TableFilter {
  column: string
  operator: FilterOperator
  value: unknown
}

export interface QueryOrder {
  column: string
  ascending?: boolean
}

export type QueryAction = 'select' | 'insert' | 'update' | 'delete'

export interface TableQueryPayload {
  action: QueryAction
  table: string
  columns?: string
  values?: Record<string, unknown> | Record<string, unknown>[]
  filters?: TableFilter[]
  order?: QueryOrder[]
  limit?: number
  single?: boolean
  maybeSingle?: boolean
  count?: 'exact'
  returning?: boolean
}

export interface RpcQueryPayload {
  action: 'rpc'
  functionName: string
  args?: Record<string, unknown>
}

export type QueryRequest = TableQueryPayload | RpcQueryPayload

export interface QueryError {
  message: string
  details?: string
  hint?: string
  code?: string
}

export interface QueryResponse<T = unknown> {
  data: T | T[] | null
  error: QueryError | null
  count?: number | null
}
