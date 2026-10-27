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

/**
 * Inserts the hidden default section of a group (no title, first position): one `?` for the group id.
 * @category Database Queries
 */
export const DEFAULT_SECTION_SQL = 'INSERT INTO section (groupID, title, position, is_default) VALUES (?, NULL, 0, 1)'
