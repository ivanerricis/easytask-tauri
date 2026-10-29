import type { NewTaskPosition } from "@/lib/store/preferences"

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

/**
 * The last part of `INSERT ... SELECT`: the position after the last live sibling (an empty list starts at 0), as
 * `COALESCE(MAX(position) + 1, 0) FROM <table> WHERE <where>`. `where` selects the siblings (and must exclude the trash).
 * @category Database Queries
 */
export const nextPositionSql = (table: string, where: string) =>
    `COALESCE(MAX(position) + 1, 0) FROM ${table} WHERE ${where}`

/**
 * SQL of the position of a new row among its siblings: after the last one, or before the first one ("top": one below the
 * lowest position, so the siblings are not renumbered and the order stays valid for restore from the trash and for the
 * moves, which renumber the whole list anyway). The siblings are selected by `where`, an empty list starts at 0.
 * @category Database Queries
 */
export const newPositionSql = (position: NewTaskPosition, from: string, where: string) =>
    position === "top"
        ? `COALESCE((SELECT MIN(position) - 1 FROM ${from} WHERE ${where}), 0)`
        : `COALESCE((SELECT MAX(position) + 1 FROM ${from} WHERE ${where}), 0)`
