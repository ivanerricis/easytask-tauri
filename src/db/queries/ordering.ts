import type { TxRef } from "../transaction"

/**
 * Clamps a caller supplied index to the valid range [0, length].
 * @category Database Queries
 */
export const clampIndex = (index: number, length: number) => Math.max(0, Math.min(Math.trunc(index) || 0, length))

/** A column assigned to the same value on every row of a position update (the new parent of the rows). */
export type PositionParent = { column: "groupID" | "folderID", value: number | TxRef | null }

/**
 * Builds the single UPDATE that assigns sequential positions to an ordered list of rows,
 * optionally setting a parent column (groupID/folderID) on all of them.
 * @param table Table to update (fixed by the callers, never user input).
 * @param ids Row ids in their final order.
 * @param parent Parent column to set on every row, omitted when the rows keep their parent.
 * @returns The SQL and its parameters.
 * @category Database Queries
 */
export function buildPositionUpdate(
    table: "section" | "task" | "section_group" | "folder" | "note",
    ids: (number | TxRef)[],
    parent?: PositionParent,
) {
    const cases = ids.map(() => "WHEN ? THEN ?").join(" ")
    const placeholders = ids.map(() => "?").join(",")
    const params: unknown[] = parent ? [parent.value] : []
    ids.forEach((id, index) => params.push(id, index))
    params.push(...ids)
    return {
        sql: `UPDATE ${table} SET ${parent ? `${parent.column} = ?, ` : ""}position = CASE id ${cases} END WHERE id IN (${placeholders})`,
        params,
    }
}
