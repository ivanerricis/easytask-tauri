import i18n from "@/i18n"
import type { Group, Section, Task } from "@/types/types";
import { getDB } from "../dbManager";
import { createError, handleDBError } from "@/types/error";
import { getErrorMessage } from "@/lib/utils";
import { chunked, placeholders } from "./sql";


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
        // Three independent selects (no transaction): the pooled connection can serve them in parallel
        const [groups, sectionRows, tasks] = await Promise.all([
            db.select<Group[]>(
                `SELECT * FROM section_group WHERE noteID=? AND deleted_at IS NULL${gA} ORDER BY position`, [noteId]),
            db.select<Section[]>(`
                SELECT * FROM section WHERE deleted_at IS NULL${gA} AND groupID IN (
                SELECT id FROM section_group WHERE noteID=? AND deleted_at IS NULL${gA})
                ORDER BY position, id`, [noteId]),
            db.select<Task[]>(`
                SELECT * FROM task WHERE deleted_at IS NULL${gA} AND sectionID IN (
                SELECT id FROM section WHERE deleted_at IS NULL${gA} AND groupID IN (
                SELECT id FROM section_group WHERE noteID=? AND deleted_at IS NULL${gA}))
                ORDER BY position, id`, [noteId]),
        ])
        // A section without a title (NULL) is an empty string in the app
        const sections = sectionRows.map(section => ({ ...section, title: section.title ?? "" }))
        return { groups, sections, tasks }
    } catch (error: unknown) {
        throw createError('NOTE_DATA_LOAD_FAILED', i18n.t("errors.note.load", { message: getErrorMessage(error) }))
    }
}

/** The groups, sections and tasks of a note (see getDBNoteData). */
export type NoteData = { groups: Group[], sections: Section[], tasks: Task[] }

/**
 * Like getDBNoteData for many notes at once: a few selects for the whole list (chunked) instead of three per note.
 * Same filters and order as getDBNoteData; notes without any row get empty lists.
 * @param noteIds The IDs of the notes.
 * @param includeArchived Keeps the archived groups, sections and tasks (default false).
 * @returns The data of every note, by note id.
 * @throws A createError('NOTE_DATA_LOAD_FAILED') error when the query fails.
 * @category Database
 */
export async function getDBNotesData(noteIds: readonly number[], includeArchived = false): Promise<Map<number, NoteData>> {
    try {
        const db = await getDB()
        const arch = (alias: string) => includeArchived ? "" : ` AND ${alias}.archived_at IS NULL`
        const result = new Map<number, NoteData>(noteIds.map(id => [id, { groups: [], sections: [], tasks: [] }]))
        const dataOf = (noteID: number) => result.get(noteID)!

        for (const ids of chunked(noteIds)) {
            const marks = placeholders(ids.length)
            const [groups, sections, tasks] = await Promise.all([
                db.select<Group[]>(
                    `SELECT * FROM section_group g WHERE g.noteID IN (${marks}) AND g.deleted_at IS NULL${arch("g")} ORDER BY g.position, g.id`, ids),
                db.select<(Section & { _noteID: number })[]>(
                    `SELECT s.*, g.noteID AS _noteID FROM section s
                     INNER JOIN section_group g ON g.id = s.groupID
                     WHERE g.noteID IN (${marks}) AND g.deleted_at IS NULL${arch("g")} AND s.deleted_at IS NULL${arch("s")}
                     ORDER BY s.position, s.id`, ids),
                db.select<(Task & { _noteID: number })[]>(
                    `SELECT t.*, g.noteID AS _noteID FROM task t
                     INNER JOIN section s ON s.id = t.sectionID
                     INNER JOIN section_group g ON g.id = s.groupID
                     WHERE g.noteID IN (${marks}) AND g.deleted_at IS NULL${arch("g")} AND s.deleted_at IS NULL${arch("s")}
                       AND t.deleted_at IS NULL${arch("t")}
                     ORDER BY t.position, t.id`, ids),
            ])
            for (const group of groups) dataOf(group.noteID).groups.push(group)
            for (const { _noteID, ...section } of sections) dataOf(_noteID).sections.push({ ...section, title: section.title ?? "" })
            for (const { _noteID, ...task } of tasks) dataOf(_noteID).tasks.push(task as Task)
        }
        return result
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