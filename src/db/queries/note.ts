import i18n from "@/i18n"
import type { Group, Section, Task } from "@/types/types";
import { getDB } from "../dbManager";
import { createError, handleDBError } from "@/types/error";
import { getErrorMessage } from "@/lib/utils";


/**
 * Retrieves the data for a specific note from the database.
 * @param noteId The ID of the note for which to retrieve data.
 * Soft deleted groups, sections and tasks are excluded, and so are the archived groups, sections and tasks (with what they contain)
 * unless `includeArchived` is set (used by the export, which keeps them). Groups, sections and tasks are ordered by position (then id).
 * @param includeArchived Keeps the archived groups, sections and tasks (default false).
 * @returns The note data, including groups, sections, and tasks.
 * @throws A createError('NOTE_DATA_LOAD_FAILED') error when the query fails.
 * @category Database
 */
export async function getDBNoteData(noteId: number, includeArchived = false) {
    try {
        const db = await getDB()
        const gA = includeArchived ? "" : " AND archived_at IS NULL"
        const groups = await db.select<Group[]>(
            `SELECT * FROM section_group WHERE noteID=? AND deleted_at IS NULL${gA} ORDER BY position`, [noteId])
        const sections = await db.select<Section[]>(`
            SELECT * FROM section WHERE deleted_at IS NULL${gA} AND groupID IN (
            SELECT id FROM section_group WHERE noteID=? AND deleted_at IS NULL${gA})
            ORDER BY position, id`, [noteId])
        const tasks = await db.select<Task[]>(`
            SELECT * FROM task WHERE deleted_at IS NULL${gA} AND sectionID IN (
            SELECT id FROM section WHERE deleted_at IS NULL${gA} AND groupID IN (
            SELECT id FROM section_group WHERE noteID=? AND deleted_at IS NULL${gA}))
            ORDER BY position, id`, [noteId]);
        return { groups, sections, tasks }
    } catch (error: unknown) {
        throw createError('NOTE_DATA_LOAD_FAILED', i18n.t("errors.note.load", { message: getErrorMessage(error) }))
    }
}

/**
 * Creates a new note in the database.
 * @param workspaceId The ID of the workspace to which the note belongs.
 * @param name The name of the note.
 * @param color The color of the note (optional).
 * @category Database
 */
export async function createDBWorkspaceNote(workspaceId: number, name: string, color?: string | null) {
    try {
        const db = await getDB()
        const result = await db.execute(
            `INSERT INTO note (workspaceID, name, color, position)
             SELECT ?, ?, ?, COALESCE(MAX(position) + 1, 0) FROM note
             WHERE workspaceID = ? AND folderID IS NULL AND deleted_at IS NULL`,
            [workspaceId, name, color ?? null, workspaceId]);
        return result.lastInsertId as number
    } catch (error: unknown) {
        handleDBError(error, "NOTE", {
            UNIQUE: i18n.t("errors.note.unique"),
            CHECK: i18n.t("errors.note.check"),
        })
    }
}

/**
 * Creates a new note in a specific folder, appended after its siblings.
 * @param workspaceId The ID of the workspace of the folder.
 * @param folderId The ID of the folder where the note will be created.
 * @param name The name of the note.
 * @param color The color of the note (optional).
 * @category Database
 */
export async function createDBNoteInFolder(workspaceId: number, folderId: number, name: string) {
    try {
        const db = await getDB()
        const result = await db.execute(
            `INSERT INTO note (workspaceID, folderID, name, position)
             SELECT ?, ?, ?, COALESCE(MAX(position) + 1, 0) FROM note
             WHERE folderID = ? AND deleted_at IS NULL`,
            [workspaceId, folderId, name, folderId]);
        return result.lastInsertId as number
    } catch (error: unknown) {
        handleDBError(error, "NOTE", {
            UNIQUE: i18n.t("errors.note.unique"),
            CHECK: i18n.t("errors.note.check"),
        })
    }
}