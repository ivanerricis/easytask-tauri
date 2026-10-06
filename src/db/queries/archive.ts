import i18n from "@/i18n"
import type { ArchiveItem, ArchiveItemType } from "@/types/types";
import { createError, handleDBError } from "@/types/error";
import { getErrorMessage } from "@/lib/utils";
import { getDB } from "../dbManager";
import { Transaction } from "../transaction";
import type { DBItemType } from "./shared_queries";
import { buildRestoreStatements, formatTrashSummary, loadTrashCounts } from "./trash";

const ARCHIVE_TYPES: readonly ArchiveItemType[] = ["folder", "note", "section_group", "section"]

// Guards the table name interpolated into the SQL strings: only folders, notes, groups and sections can be archived
function assertArchiveType(itemType: string): asserts itemType is ArchiveItemType {
    if (!(ARCHIVE_TYPES as readonly string[]).includes(itemType))
        throw createError("INVALID_ITEM_TYPE", i18n.t("errors.unsupportedItemType", { type: itemType }))
}

/**
 * Archives an item: it (and everything it contains) disappears from the sidebar and the note without going to the trash,
 * and can be brought back with unarchiveDBItem. Only the item itself is marked, its children are hidden through their parent.
 * Archiving an item that is already archived or is in the trash is a no-op.
 * @param itemType "folder", "note", "section_group" or "section" (tasks cannot be archived).
 * @param itemID ID of the item to archive.
 * @throws A createError('<TYPE>_ARCHIVE_FAILED') error when the query fails, 'INVALID_ITEM_TYPE' for another type.
 * @category Database Queries
 */
export async function archiveDBItem(itemType: ArchiveItemType, itemID: number) {
    assertArchiveType(itemType)
    const db = await getDB()

    try {
        await db.execute(
            `UPDATE ${itemType} SET archived_at = datetime('now','localtime') WHERE id=? AND archived_at IS NULL AND deleted_at IS NULL`,
            [itemID])
    } catch (error: unknown) {
        throw createError(`${itemType.toUpperCase()}_ARCHIVE_FAILED`, i18n.t("errors.archive.archive", { message: getErrorMessage(error) }))
    }
}

/**
 * Brings an item back from the archive together with its archived ancestors (folder chain, note, group), so it never
 * stays hidden by an archived parent. Unarchiving an item that is not archived is a no-op.
 * All the statements run in one transaction: on a name conflict nothing is unarchived.
 * @param itemType "folder", "note", "section_group" or "section".
 * @param itemID ID of the item to unarchive.
 * @throws A "<TYPE>_EXISTS" error (message errors.trash.restoreUnique) when a visible item with the same name exists.
 * @category Database Queries
 */
export async function unarchiveDBItem(itemType: ArchiveItemType, itemID: number) {
    assertArchiveType(itemType)

    try {
        const tx = new Transaction()
        for (const statement of buildRestoreStatements(itemType, itemID, "archived_at"))
            tx.add(statement.sql, statement.params)
        await tx.run()
    } catch (error: unknown) {
        handleDBError(error, itemType.toUpperCase(), { UNIQUE: i18n.t("errors.trash.restoreUnique") })
    }
}

// Folders and notes that are not in the trash and whose whole chain of folders is not in the trash either
const LIVE_CTE = `live_folder(id) AS (
        SELECT id FROM folder WHERE workspaceID = ? AND folderID IS NULL AND deleted_at IS NULL
        UNION ALL
        SELECT f.id FROM folder f INNER JOIN live_folder lf ON f.folderID = lf.id WHERE f.deleted_at IS NULL),
    live_note(id, name) AS (
        SELECT n.id, n.name FROM note n WHERE n.workspaceID = ? AND n.deleted_at IS NULL
          AND (n.folderID IS NULL OR n.folderID IN (SELECT id FROM live_folder)))`

type ArchiveRow = { type: ArchiveItemType, id: number, name: string, context: string | null, archived_at: string, extra: number }

/**
 * Retrieves the archived items that belong to a workspace and are not in the trash (neither them nor any ancestor).
 * An item archived inside an archived parent is listed too (unarchiving it brings its archived ancestors back as well).
 * Folders and notes have the parent folder name as context, groups the note name ("Gruppo di N sezioni" as name when
 * unnamed, like in the trash), sections "Nota X". Every item also has a `summary` of what it contains
 * (see formatTrashSummary).
 * @param workspaceId The ID of the workspace.
 * @returns The archived items, most recently archived first.
 * @throws A createError('ARCHIVE_LOAD_FAILED') error when a query fails.
 * @category Database Queries
 */
export async function getDBArchive(workspaceId: number): Promise<ArchiveItem[]> {
    try {
        const db = await getDB()
        const notePrefix = i18n.t("trash.context.note")

        const rows = await db.select<ArchiveRow[]>(
            `WITH RECURSIVE ${LIVE_CTE}
             SELECT 'folder' AS type, 0 AS kind, f.id, f.name,
                    (SELECT p.name FROM folder p WHERE p.id = f.folderID) AS context, f.archived_at, 0 AS extra
             FROM folder f WHERE f.id IN (SELECT id FROM live_folder) AND f.archived_at IS NOT NULL
             UNION ALL
             SELECT 'note', 1, n.id, n.name,
                    (SELECT p.name FROM folder p WHERE p.id = n.folderID), n.archived_at, 0
             FROM note n WHERE n.id IN (SELECT id FROM live_note) AND n.archived_at IS NOT NULL
             UNION ALL
             SELECT 'section_group', 2, g.id, COALESCE(NULLIF(TRIM(g.name), ''), ''), ln.name, g.archived_at,
                    (SELECT COUNT(*) FROM section s WHERE s.groupID = g.id AND s.deleted_at IS NULL)
             FROM section_group g INNER JOIN live_note ln ON ln.id = g.noteID
             WHERE g.deleted_at IS NULL AND g.archived_at IS NOT NULL
             UNION ALL
             SELECT 'section', 3, s.id, s.title, ? || ln.name, s.archived_at, 0
             FROM section s
             INNER JOIN section_group g ON g.id = s.groupID
             INNER JOIN live_note ln ON ln.id = g.noteID
             WHERE g.deleted_at IS NULL AND s.deleted_at IS NULL AND s.archived_at IS NOT NULL
             ORDER BY archived_at DESC, kind, id`, [workspaceId, workspaceId, notePrefix])

        const counts = await loadTrashCounts(db, workspaceId, new Set<DBItemType>(rows.map(row => row.type)), "archived_at")

        return rows.map((row): ArchiveItem => ({
            type: row.type,
            id: row.id,
            name: row.type === "section_group" && !row.name
                ? i18n.t("trash.unnamedGroup", { count: row.extra })
                : row.name,
            context: row.context ?? "",
            summary: formatTrashSummary(row.type, counts.get(row.type)?.get(row.id) ?? {}),
            archived_at: row.archived_at,
        }))
    } catch (error: unknown) {
        throw createError("ARCHIVE_LOAD_FAILED", i18n.t("errors.archive.load", { message: getErrorMessage(error) }))
    }
}

/**
 * Counts the archived items of a workspace: the same number getDBArchive(workspaceId) would list, without building
 * labels or summaries.
 * @param workspaceId The ID of the workspace.
 * @throws A createError('ARCHIVE_LOAD_FAILED') error when the query fails.
 * @category Database Queries
 */
export async function getDBArchiveCount(workspaceId: number): Promise<number> {
    try {
        const db = await getDB()
        const rows = await db.select<{ total: number }[]>(
            `WITH RECURSIVE ${LIVE_CTE}
             SELECT
                (SELECT COUNT(*) FROM folder f WHERE f.id IN (SELECT id FROM live_folder) AND f.archived_at IS NOT NULL)
              + (SELECT COUNT(*) FROM note n WHERE n.id IN (SELECT id FROM live_note) AND n.archived_at IS NOT NULL)
              + (SELECT COUNT(*) FROM section_group g INNER JOIN live_note ln ON ln.id = g.noteID
                  WHERE g.deleted_at IS NULL AND g.archived_at IS NOT NULL)
              + (SELECT COUNT(*) FROM section s
                  INNER JOIN section_group g ON g.id = s.groupID
                  INNER JOIN live_note ln ON ln.id = g.noteID
                  WHERE g.deleted_at IS NULL AND s.deleted_at IS NULL AND s.archived_at IS NOT NULL) AS total`,
            [workspaceId, workspaceId])
        return rows[0]?.total ?? 0
    } catch (error: unknown) {
        throw createError("ARCHIVE_LOAD_FAILED", i18n.t("errors.archive.load", { message: getErrorMessage(error) }))
    }
}
