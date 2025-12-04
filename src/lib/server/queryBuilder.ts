import type { DbSessionContext, DbClient } from '@/lib/db/pool'
import type { QueryRequest, QueryResponse, TableFilter, TableQueryPayload } from '@/lib/data/types'
import { buildWhere } from './filterBuilder'
import { quoteIdentifier, sanitizeColumns } from './queryUtils'

export async function runSelect<T>(client: DbClient, payload: TableQueryPayload & { action: 'select' }): Promise<QueryResponse<T>> {
  const { clause, values } = buildWhere(payload.filters)

  const table = quoteIdentifier(payload.table)
  const columns = sanitizeColumns(payload.columns)

  const orderClause = (payload.order ?? [])
    .map((order) => `${quoteIdentifier(order.column)} ${order.ascending === false ? 'DESC' : 'ASC'}`)
    .join(', ')

  const queryValues = [...values]
  let sql = `SELECT ${columns} FROM ${table} ${clause}`

  if (orderClause) {
    sql += ` ORDER BY ${orderClause}`
  }

  if (payload.limit) {
    queryValues.push(payload.limit)
    sql += ` LIMIT $${queryValues.length}`
  }

  const result = await client.query(sql, queryValues)

  let data: any = result.rows
  if (payload.single) {
    if (data.length !== 1) {
      return { data: null, error: { message: 'Expected a single row but query returned a different result size.' } }
    }
    data = data[0]
  } else if (payload.maybeSingle) {
    if (data.length > 1) {
      return { data: null, error: { message: 'Expected at most one row but query returned multiple rows.' } }
    }
    data = data[0] ?? null
  }

  let count: number | null | undefined = undefined
  if (payload.count === 'exact') {
    const countResult = await client.query(`SELECT COUNT(*) as count FROM ${table} ${clause}`, values)
    count = Number(countResult.rows[0]?.count ?? 0)
  }

  return { data, count: count ?? null, error: null }
}

export async function runInsert<T>(client: DbClient, payload: TableQueryPayload & { action: 'insert' }): Promise<QueryResponse<T>> {
  const table = quoteIdentifier(payload.table)
  const rows = Array.isArray(payload.values) ? payload.values : payload.values ? [payload.values] : []

  if (!rows.length) {
    return { data: null, error: { message: 'Insert operation requires at least one row.' } }
  }

  const columns = Object.keys(rows[0])
  if (!columns.length) {
    return { data: null, error: { message: 'Insert payload must include at least one column.' } }
  }

  const columnSql = columns.map(quoteIdentifier).join(', ')
  const values: unknown[] = []
  const valueSql = rows
    .map((row, rowIndex) => {
      const placeholders = columns
        .map((column, colIndex) => {
          values.push(row[column as keyof typeof row])
          return `$${rowIndex * columns.length + colIndex + 1}`
        })
        .join(', ')
      return `(${placeholders})`
    })
    .join(', ')

  const sql = `INSERT INTO ${table} (${columnSql}) VALUES ${valueSql} RETURNING *`
  const result = await client.query(sql, values)
  return { data: result.rows as T[], error: null }
}

export async function runUpdate<T>(client: DbClient, payload: TableQueryPayload & { action: 'update' }): Promise<QueryResponse<T>> {
  const table = quoteIdentifier(payload.table)
  const valuesObject = payload.values
  if (!valuesObject || Array.isArray(valuesObject)) {
    return { data: null, error: { message: 'Update payload must be a single object.' } }
  }

  const columns = Object.keys(valuesObject)
  if (!columns.length) {
    return { data: null, error: { message: 'Update payload requires at least one column.' } }
  }

  const setClauses: string[] = []
  const setValues: unknown[] = []
  columns.forEach((column, index) => {
    setClauses.push(`${quoteIdentifier(column)} = $${index + 1}`)
    setValues.push(valuesObject[column as keyof typeof valuesObject])
  })

  const { clause, values: filterValues } = buildWhere(payload.filters, setValues.length + 1)
  const sql = `UPDATE ${table} SET ${setClauses.join(', ')} ${clause || ''} RETURNING *`
  const result = await client.query(sql, [...setValues, ...filterValues])
  return { data: result.rows as T[], error: null }
}

export async function runDelete<T>(client: DbClient, payload: TableQueryPayload & { action: 'delete' }): Promise<QueryResponse<T>> {
  const { clause, values } = buildWhere(payload.filters)

  const table = quoteIdentifier(payload.table)
  const sql = `DELETE FROM ${table} ${clause} RETURNING *`
  const result = await client.query(sql, values)
  return { data: result.rows as T[], error: null }
}