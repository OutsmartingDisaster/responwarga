import type { TableFilter } from '@/lib/data/types'
import { quoteIdentifier } from './queryUtils'

export function buildWhere(filters: TableFilter[] | undefined, startIndex = 1) {
  const clauses: string[] = []
  const values: unknown[] = []

  filters?.forEach((filter) => {
    const column = quoteIdentifier(filter.column)
    const placeholder = `$${values.length + startIndex}`

    switch (filter.operator) {
      case 'eq':
        if (filter.value === null) {
          clauses.push(`${column} IS NULL`)
        } else {
          clauses.push(`${column} = ${placeholder}`)
          values.push(filter.value)
        }
        break
      case 'neq':
        if (filter.value === null) {
          clauses.push(`${column} IS NOT NULL`)
        } else {
          clauses.push(`${column} <> ${placeholder}`)
          values.push(filter.value)
        }
        break
      case 'gt':
        clauses.push(`${column} > ${placeholder}`)
        values.push(filter.value)
        break
      case 'gte':
        clauses.push(`${column} >= ${placeholder}`)
        values.push(filter.value)
        break
      case 'lt':
        clauses.push(`${column} < ${placeholder}`)
        values.push(filter.value)
        break
      case 'lte':
        clauses.push(`${column} <= ${placeholder}`)
        values.push(filter.value)
        break
      case 'in':
        if (!Array.isArray(filter.value)) {
          throw new Error('IN filter expects an array value')
        }
        clauses.push(`${column} = ANY(${placeholder})`)
        values.push(filter.value)
        break
      case 'like':
        clauses.push(`${column} LIKE ${placeholder}`)
        values.push(filter.value)
        break
      case 'ilike':
        clauses.push(`${column} ILIKE ${placeholder}`)
        values.push(filter.value)
        break
      case 'is':
        clauses.push(filter.value === null ? `${column} IS NULL` : `${column} IS NOT NULL`)
        break
      default:
        throw new Error(`Unsupported filter operator: ${filter.operator}`)
    }
  })

  return {
    clause: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    values,
  }
}