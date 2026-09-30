import { createError, handleDBError } from "@/types/error";
import { getDB } from "../dbManager";

type TreeItemType = "folder" | "note"

type TreeRow = { id: number, workspaceID: number | null, folderID: number | null }

const MOVE_UNIQUE_MESSAGE = "Esiste già un elemento con questo nome nella cartella di destinazione."

/**
 * Builds the single UPDATE that assigns the parent and the sequential positions to an ordered list of siblings.
 * @param table Table to update (already validated).
 * @param ids Sibling ids in their final order.
 * @param parentId Parent folder id shared by all the siblings (null for the workspace root).
 * @returns The SQL and its parameters.
 * @category Database Queries
 */
function buildReorderUpdate(table: TreeItemType, ids: number[], parentId: number | null) {
    const cases = ids.map(() => "WHEN ? THEN ?").join(" ")
    const placeholders = ids.map(() => "?").join(",")
    const params: (number | null)[] = [parentId]
    ids.forEach((id, index) => params.push(id, index))
    params.push(...ids)
    return {
        sql: `UPDATE ${table} SET folderID = ?, position = CASE id ${cases} END WHERE id IN (${placeholders})`,
        params,
    }
}

/**
 * Moves a folder or a note to a folder (or to the workspace root) at a given index among its new siblings.
 * The index refers to the siblings of the same type (folders and notes are ordered separately)
 * and is clamped to the valid range. The destination siblings are renumbered with one UPDATE,
 * and so are the siblings of the old parent when the parent changes.
 * The caller is responsible for reloading the workspace data.
 * @param itemType "folder" or "note".
 * @param itemId ID of the item to move.
 * @param targetFolderId ID of the destination folder, null for the workspace root.
 * @param targetIndex Position among the destination siblings (0 based).
 * @throws FOLDER_MOVE_INVALID when a folder is moved into itself or one of its descendants.
 * @throws A "<TYPE>_EXISTS" error when the destination already contains an item with the same name.
 * @category Database Queries
 */
export async function moveDBTreeItem(itemType: TreeItemType, itemId: number, targetFolderId: number | null, targetIndex: number) {
    if (itemType !== "folder" && itemType !== "note")
        throw createError("INVALID_ITEM_TYPE", `Unsupported item type: ${itemType}`)

    const db = await getDB()
    const table: TreeItemType = itemType

    try {
        const items = await db.select<TreeRow[]>(
            `SELECT id, workspaceID, folderID FROM ${table} WHERE id = ? AND deleted_at IS NULL`, [itemId])
        const item = items[0]
        if (!item)
            throw createError("ITEM_NOT_FOUND", "L'elemento da spostare non esiste.")
        if (item.workspaceID == null)
            throw createError("ITEM_MOVE_INVALID", "L'elemento non appartiene a un workspace.")

        if (targetFolderId != null) {
            if (itemType === "folder") {
                const subtree = await db.select<{ id: number }[]>(
                    `WITH RECURSIVE folder_tree AS (
                        SELECT id FROM folder WHERE id = ?
                        UNION ALL
                        SELECT f.id FROM folder f INNER JOIN folder_tree ft ON f.folderID = ft.id
                    )
                    SELECT id FROM folder_tree`, [itemId])
                if (subtree.some(row => row.id === targetFolderId))
                    throw createError("FOLDER_MOVE_INVALID", "Non puoi spostare una cartella dentro sé stessa o una sua sottocartella.")
            }

            const targets = await db.select<{ id: number, workspaceID: number | null }[]>(
                'SELECT id, workspaceID FROM folder WHERE id = ? AND deleted_at IS NULL', [targetFolderId])
            if (!targets[0] || targets[0].workspaceID !== item.workspaceID)
                throw createError("FOLDER_MOVE_INVALID", "La cartella di destinazione non è valida.")
        }

        const loadSiblings = async (parentId: number | null) => {
            const rows = parentId == null
                ? await db.select<{ id: number }[]>(
                    `SELECT id FROM ${table} WHERE workspaceID = ? AND folderID IS NULL AND deleted_at IS NULL AND id <> ?
                     ORDER BY position, name COLLATE NOCASE`, [item.workspaceID, itemId])
                : await db.select<{ id: number }[]>(
                    `SELECT id FROM ${table} WHERE workspaceID = ? AND folderID = ? AND deleted_at IS NULL AND id <> ?
                     ORDER BY position, name COLLATE NOCASE`, [item.workspaceID, parentId, itemId])
            return rows.map(row => row.id)
        }

        const order = await loadSiblings(targetFolderId)
        const index = Math.max(0, Math.min(Math.trunc(targetIndex) || 0, order.length))
        order.splice(index, 0, itemId)

        const destination = buildReorderUpdate(table, order, targetFolderId)
        try {
            await db.execute(destination.sql, destination.params)
        } catch (error: unknown) {
            handleDBError(error, itemType.toUpperCase(), { UNIQUE: MOVE_UNIQUE_MESSAGE })
        }

        if ((item.folderID ?? null) !== targetFolderId) {
            const remaining = await loadSiblings(item.folderID ?? null)
            if (remaining.length > 0) {
                const source = buildReorderUpdate(table, remaining, item.folderID ?? null)
                await db.execute(source.sql, source.params)
            }
        }
    } catch (error: unknown) {
        // createError objects are already user facing, only unexpected failures are wrapped
        if (typeof error === "object" && error !== null && "code" in error && "message" in error)
            throw error
        handleDBError(error, itemType.toUpperCase(), { UNIQUE: MOVE_UNIQUE_MESSAGE })
    }
}
