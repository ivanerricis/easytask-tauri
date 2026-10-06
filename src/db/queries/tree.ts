import i18n from "@/i18n"
import { createError, handleDBError, isAppError } from "@/types/error";
import { getDB } from "../dbManager";
import { Transaction } from "../transaction";
import { buildPositionUpdate, clampIndex } from "./ordering";

type TreeItemType = "folder" | "note"

type TreeRow = { id: number, workspaceID: number | null, folderID: number | null }

const MOVE_UNIQUE_MESSAGE = () => i18n.t("errors.tree.moveUnique")

/**
 * Moves a folder or a note to a folder (or to the workspace root) at a given index among its new siblings.
 * The index refers to the siblings of the same type (folders and notes are ordered separately)
 * and is clamped to the valid range. The destination siblings are renumbered with one UPDATE,
 * and so are the siblings of the old parent when the parent changes (both in one transaction).
 * The caller is responsible for reloading the workspace data.
 * @param itemType "folder" or "note".
 * @param itemId ID of the item to move.
 * @param targetFolderId ID of the destination folder (neither deleted nor archived), null for the workspace root.
 * @param targetIndex Position among the destination siblings (0 based).
 * @throws FOLDER_MOVE_INVALID when a folder is moved into itself or one of its descendants.
 * @throws A "<TYPE>_EXISTS" error when the destination already contains an item with the same name.
 * @category Database Queries
 */
export async function moveDBTreeItem(itemType: TreeItemType, itemId: number, targetFolderId: number | null, targetIndex: number) {
    if (itemType !== "folder" && itemType !== "note")
        throw createError("INVALID_ITEM_TYPE", i18n.t("errors.unsupportedItemType", { type: itemType }))

    const db = await getDB()
    const table: TreeItemType = itemType

    try {
        const items = await db.select<TreeRow[]>(
            `SELECT id, workspaceID, folderID FROM ${table} WHERE id = ? AND deleted_at IS NULL`, [itemId])
        const item = items[0]
        if (!item)
            throw createError("ITEM_NOT_FOUND", i18n.t("errors.tree.itemMissing"))
        if (item.workspaceID == null)
            throw createError("ITEM_MOVE_INVALID", i18n.t("errors.tree.noWorkspace"))

        if (targetFolderId != null) {
            if (itemType === "folder") {
                // Walk up from the target through the primary key: the moved folder is among its ancestors
                // (or is the target itself) exactly when the target lies in the moved subtree
                const ancestors = await db.select<{ found: number }[]>(
                    `WITH RECURSIVE anc(id, parent) AS (
                        SELECT id, folderID FROM folder WHERE id = ?
                        UNION
                        SELECT f.id, f.folderID FROM folder f INNER JOIN anc ON f.id = anc.parent
                    )
                    SELECT EXISTS (SELECT 1 FROM anc WHERE id = ?) AS found`, [targetFolderId, itemId])
                if (ancestors[0]?.found)
                    throw createError("FOLDER_MOVE_INVALID", i18n.t("errors.tree.folderIntoItself"))
            }

            const targets = await db.select<{ id: number, workspaceID: number | null }[]>(
                'SELECT id, workspaceID FROM folder WHERE id = ? AND deleted_at IS NULL AND archived_at IS NULL', [targetFolderId])
            if (!targets[0] || targets[0].workspaceID !== item.workspaceID)
                throw createError("FOLDER_MOVE_INVALID", i18n.t("errors.tree.folderTargetInvalid"))
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
        const index = clampIndex(targetIndex, order.length)
        order.splice(index, 0, itemId)

        const tx = new Transaction()
        const destination = buildPositionUpdate(table, order, { column: "folderID", value: targetFolderId })
        tx.add(destination.sql, destination.params)

        if ((item.folderID ?? null) !== targetFolderId) {
            // The moved item is excluded by loadSiblings: it already belongs to the destination
            const remaining = await loadSiblings(item.folderID ?? null)
            if (remaining.length > 0) {
                const source = buildPositionUpdate(table, remaining, { column: "folderID", value: item.folderID ?? null })
                tx.add(source.sql, source.params)
            }
        }
        await tx.run()
    } catch (error: unknown) {
        // createError objects are already user facing, only unexpected failures are wrapped
        if (isAppError(error)) throw error
        handleDBError(error, itemType.toUpperCase(), { UNIQUE: MOVE_UNIQUE_MESSAGE() })
    }
}
