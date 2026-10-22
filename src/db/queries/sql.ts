// SQLite rows/ids per `IN (?, ?, …)` list: keeps the number of bound parameters far below the SQLite limit
const IN_CHUNK = 500

/**
 * Splits a list in chunks that can safely be bound to one `IN (?, ?, …)` list each.
 * @category Database Queries
 */
export function chunked<T>(items: readonly T[], size = IN_CHUNK): T[][] {
    const chunks: T[][] = []
    for (let start = 0; start < items.length; start += size) chunks.push(items.slice(start, start + size))
    return chunks
}

/**
 * The placeholders of an `IN` list: `?, ?, ?`.
 * @category Database Queries
 */
export const placeholders = (count: number) => Array.from({ length: count }, () => "?").join(", ")
