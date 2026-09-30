import type { TrashItem, Workspace } from "@/types/types";
import { createError, handleDBError } from "@/types/error";
import { getErrorMessage } from "@/lib/utils";
import { getDB } from "../dbManager";
import { assertItemType, type DBItemType } from "./shared_queries";

const RESTORE_UNIQUE_MESSAGE = "Esiste già un elemento con questo nome: rinominalo prima di ripristinare."

type TrashRow = { type: DBItemType, id: number, name: string, context: string | null, deleted_at: string, extra: number }

/**
 * Retrieves the items moved to the trash that belong to a workspace.
 * Only the items deleted directly are listed (their children are removed with them).
 * Groups have the name "Gruppo di N sezioni" and the note name as context;
 * sections and tasks have "Nota X" / "Nota X › Sezione Y" as context,
 * audio files "Nota X › Gruppo N" (N = position of the group in the note).
 * @param workspaceId The ID of the workspace.
 * @returns The trashed items, most recently deleted first.
 * @throws A createError('TRASH_LOAD_FAILED') error when a query fails.
 * @category Database Queries
 */
export async function getDBTrash(workspaceId: number): Promise<TrashItem[]> {
    try {
        const db = await getDB()

        // One UNION ALL query; `kind` keeps the historical order among items deleted at the same time
        const rows = await db.select<TrashRow[]>(
            `SELECT 'folder' AS type, 0 AS kind, f.id, f.name,
                    (SELECT p.name FROM folder p WHERE p.id = f.folderID) AS context, f.deleted_at, 0 AS extra
             FROM folder f WHERE f.workspaceID = ? AND f.deleted_at IS NOT NULL
             UNION ALL
             SELECT 'note', 1, n.id, n.name,
                    (SELECT p.name FROM folder p WHERE p.id = n.folderID), n.deleted_at, 0
             FROM note n WHERE n.workspaceID = ? AND n.deleted_at IS NOT NULL
             UNION ALL
             SELECT 'section_group', 2, g.id, '', n.name, g.deleted_at,
                    (SELECT COUNT(*) FROM section s WHERE s.groupID = g.id)
             FROM section_group g INNER JOIN note n ON n.id = g.noteID
             WHERE n.workspaceID = ? AND g.deleted_at IS NOT NULL
             UNION ALL
             SELECT 'section', 3, s.id, s.title, 'Nota ' || n.name, s.deleted_at, 0
             FROM section s
             INNER JOIN section_group g ON g.id = s.groupID
             INNER JOIN note n ON n.id = g.noteID
             WHERE n.workspaceID = ? AND s.deleted_at IS NOT NULL
             UNION ALL
             SELECT 'task', 4, t.id, t.text, 'Nota ' || n.name || ' › Sezione ' || s.title, t.deleted_at, 0
             FROM task t
             INNER JOIN section s ON s.id = t.sectionID
             INNER JOIN section_group g ON g.id = s.groupID
             INNER JOIN note n ON n.id = g.noteID
             WHERE n.workspaceID = ? AND t.deleted_at IS NOT NULL
             UNION ALL
             SELECT 'audio_file', 5, a.id, a.name, 'Nota ' || n.name || ' › Gruppo ' || (g.position + 1), a.deleted_at, 0
             FROM audio_file a
             INNER JOIN section_group g ON g.id = a.section_groupID
             INNER JOIN note n ON n.id = g.noteID
             WHERE n.workspaceID = ? AND a.deleted_at IS NOT NULL
             ORDER BY deleted_at DESC, kind, id`, [workspaceId, workspaceId, workspaceId, workspaceId, workspaceId, workspaceId])

        return rows.map(row => ({
            type: row.type,
            id: row.id,
            name: row.type === "section_group"
                ? `Gruppo di ${row.extra} ${row.extra === 1 ? "sezione" : "sezioni"}`
                : row.name,
            context: row.context ?? "",
            deleted_at: row.deleted_at,
        }))
    } catch (error: unknown) {
        throw createError("TRASH_LOAD_FAILED", "Failed to load the trash: " + getErrorMessage(error))
    }
}

/**
 * Retrieves the workspaces moved to the trash.
 * @returns The deleted workspaces, most recently deleted first.
 * @category Database Queries
 */
export async function getDBTrashedWorkspaces(): Promise<Workspace[]> {
    try {
        const db = await getDB()
        return await db.select<Workspace[]>('SELECT * FROM workspace WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC')
    } catch (error: unknown) {
        throw createError("TRASH_LOAD_FAILED", "Failed to load the trashed workspaces: " + getErrorMessage(error))
    }
}

type Statement = { sql: string, params: number[] }

// Restores the folder whose id is returned by startSql and every deleted ancestor folder
const folderChain = (startSql: string, params: number[]): Statement => ({
    sql: `UPDATE folder SET deleted_at = NULL WHERE deleted_at IS NOT NULL AND id IN (
            WITH RECURSIVE anc(id, parent) AS (
                SELECT id, folderID FROM folder WHERE id = (${startSql})
                UNION
                SELECT f.id, f.folderID FROM folder f INNER JOIN anc ON f.id = anc.parent
            ) SELECT id FROM anc)`,
    params,
})

const restoreRow = (table: string, idSql: string, params: number[]): Statement => ({
    sql: `UPDATE ${table} SET deleted_at = NULL WHERE deleted_at IS NOT NULL AND id = (${idSql})`,
    params,
})

const NOTE_OF_GROUP = "SELECT noteID FROM section_group WHERE id = ?"
const GROUP_OF_SECTION = "SELECT groupID FROM section WHERE id = ?"
const SECTION_OF_TASK = "SELECT sectionID FROM task WHERE id = ?"

/**
 * Builds the statements that restore an item and its deleted ancestors, top-down
 * (ancestors first, so that a name conflict on the item leaves nothing half hidden).
 * @category Database Queries
 */
function buildRestoreStatements(itemType: DBItemType, id: number): Statement[] {
    switch (itemType) {
        case "workspace":
            return [restoreRow("workspace", "SELECT ?", [id])]
        case "folder":
            return [folderChain("SELECT ?", [id])]
        case "note":
            return [
                folderChain("SELECT folderID FROM note WHERE id = ?", [id]),
                restoreRow("note", "SELECT ?", [id]),
            ]
        case "section_group":
            return [
                folderChain(`SELECT folderID FROM note WHERE id = (${NOTE_OF_GROUP})`, [id]),
                restoreRow("note", NOTE_OF_GROUP, [id]),
                restoreRow("section_group", "SELECT ?", [id]),
            ]
        case "section": {
            const noteOfSection = `SELECT noteID FROM section_group WHERE id = (${GROUP_OF_SECTION})`
            return [
                folderChain(`SELECT folderID FROM note WHERE id = (${noteOfSection})`, [id]),
                restoreRow("note", noteOfSection, [id]),
                restoreRow("section_group", GROUP_OF_SECTION, [id]),
                restoreRow("section", "SELECT ?", [id]),
            ]
        }
        case "audio_file": {
            const groupOfAudio = "SELECT section_groupID FROM audio_file WHERE id = ?"
            const noteOfAudio = `SELECT noteID FROM section_group WHERE id = (${groupOfAudio})`
            return [
                folderChain(`SELECT folderID FROM note WHERE id = (${noteOfAudio})`, [id]),
                restoreRow("note", noteOfAudio, [id]),
                restoreRow("section_group", groupOfAudio, [id]),
                restoreRow("audio_file", "SELECT ?", [id]),
            ]
        }
        case "task": {
            const groupOfTask = `SELECT groupID FROM section WHERE id = (${SECTION_OF_TASK})`
            const noteOfTask = `SELECT noteID FROM section_group WHERE id = (${groupOfTask})`
            return [
                folderChain(`SELECT folderID FROM note WHERE id = (${noteOfTask})`, [id]),
                restoreRow("note", noteOfTask, [id]),
                restoreRow("section_group", groupOfTask, [id]),
                restoreRow("section", SECTION_OF_TASK, [id]),
                {
                    sql: `UPDATE task SET deleted_at = NULL WHERE deleted_at IS NOT NULL AND id IN (
                            WITH RECURSIVE anc(id, parent) AS (
                                SELECT id, taskID FROM task WHERE id = ?
                                UNION
                                SELECT t.id, t.taskID FROM task t INNER JOIN anc ON t.id = anc.parent
                            ) SELECT id FROM anc)`,
                    params: [id],
                },
            ]
        }
    }
}

/**
 * Restores an item from the trash together with all its deleted ancestors
 * (folder chain, note, group, section, parent tasks), so it never stays orphaned.
 * Restoring an item that is not deleted is a no-op.
 * @param itemType Type of the item to restore.
 * @param itemID ID of the item to restore.
 * @throws A "<TYPE>_EXISTS" error when an active item with the same name exists.
 * @category Database Queries
 */
export async function restoreDBItem(itemType: DBItemType, itemID: number) {
    assertItemType(itemType)
    const db = await getDB()

    try {
        for (const statement of buildRestoreStatements(itemType, itemID))
            await db.execute(statement.sql, statement.params)
    } catch (error: unknown) {
        handleDBError(error, itemType.toUpperCase(), { UNIQUE: RESTORE_UNIQUE_MESSAGE })
    }
}

/**
 * Permanently deletes an item that is in the trash (foreign keys cascade to its children).
 * An item that is not in the trash is left untouched.
 * @param itemType Type of the item to delete.
 * @param itemID ID of the item to delete.
 * @category Database Queries
 */
export async function purgeDBItem(itemType: DBItemType, itemID: number) {
    assertItemType(itemType)
    const db = await getDB()

    try {
        await db.execute(`DELETE FROM ${itemType} WHERE id=? AND deleted_at IS NOT NULL`, [itemID])
    } catch (error: unknown) {
        throw createError(`${itemType.toUpperCase()}_PURGE_FAILED`, "Failed to delete item permanently: " + getErrorMessage(error))
    }
}

/**
 * Permanently deletes every trashed item of a workspace (top-level items first, children cascade).
 * @param workspaceId The ID of the workspace.
 * @category Database Queries
 */
export async function emptyDBTrash(workspaceId: number) {
    const db = await getDB()

    try {
        await db.execute('DELETE FROM folder WHERE workspaceID = ? AND deleted_at IS NOT NULL', [workspaceId])
        await db.execute('DELETE FROM note WHERE workspaceID = ? AND deleted_at IS NOT NULL', [workspaceId])
        await db.execute(
            `DELETE FROM section_group WHERE deleted_at IS NOT NULL
             AND noteID IN (SELECT id FROM note WHERE workspaceID = ?)`, [workspaceId])
        await db.execute(
            `DELETE FROM section WHERE deleted_at IS NOT NULL AND groupID IN (
                SELECT g.id FROM section_group g INNER JOIN note n ON n.id = g.noteID WHERE n.workspaceID = ?)`, [workspaceId])
        await db.execute(
            `DELETE FROM task WHERE deleted_at IS NOT NULL AND sectionID IN (
                SELECT s.id FROM section s
                INNER JOIN section_group g ON g.id = s.groupID
                INNER JOIN note n ON n.id = g.noteID WHERE n.workspaceID = ?)`, [workspaceId])
        await db.execute(
            `DELETE FROM audio_file WHERE deleted_at IS NOT NULL AND section_groupID IN (
                SELECT g.id FROM section_group g INNER JOIN note n ON n.id = g.noteID WHERE n.workspaceID = ?)`, [workspaceId])
    } catch (error: unknown) {
        throw createError("TRASH_EMPTY_FAILED", "Failed to empty the trash: " + getErrorMessage(error))
    }
}
