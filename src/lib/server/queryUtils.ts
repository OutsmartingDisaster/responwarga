export function quoteIdentifier(identifier: string) {
  if (!/^[a-zA-Z0-9_.]+$/.test(identifier)) {
    throw new Error(`Invalid identifier: ${identifier}`)
  }
  return identifier
    .split('.')
    .map((segment) => `"${segment}"`)
    .join('.')
}

export function sanitizeColumns(columns: string | undefined) {
  if (!columns || columns.trim() === '') {
    return '*'
  }
  if (!/^[a-zA-Z0-9_*,.\s]+$/.test(columns)) {
    throw new Error(`Invalid column list: ${columns}`)
  }
  return columns
}