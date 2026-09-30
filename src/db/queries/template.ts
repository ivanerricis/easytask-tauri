import type Database from "@tauri-apps/plugin-sql";
import type { NoteTemplate, NoteTemplateContent, TemplateGroup, TemplateSection, TemplateTask } from "@/types/template";
import type { Task } from "@/types/types";
import { createError, handleDBError } from "@/types/error";
import { getErrorMessage } from "@/lib/utils";
import { getDB } from "../dbManager";
import { getDBNoteData } from "./note";

const TEMPLATE_UNIQUE_MESSAGE = "Esiste già un template con questo nome."
const TEMPLATE_CHECK_MESSAGE = "Il nome del template non può essere vuoto."
const NOTE_UNIQUE_MESSAGE = "Esiste già una nota con questo nome nella cartella di destinazione."
const NOTE_CHECK_MESSAGE = "Il nome della nota non può essere vuoto."
const SOURCE_MISSING_MESSAGE = "La nota di origine non esiste più."

// Rows per multi-row INSERT (keeps the number of bound parameters far below the SQLite limit)
const INSERT_CHUNK = 500

type TemplateRow = Omit<NoteTemplate, "content"> & { content: string }

const EMPTY_CONTENT: NoteTemplateContent = { version: 1, groups: [] }

// Errors built with createError (plain objects); driver errors are Error instances (or strings) and must not match
const isAppError = (error: unknown): error is { code: string, message: string } =>
    typeof error === "object" && error !== null && !(error instanceof Error) && "code" in error && "message" in error

const toTemplate = ({ content, ...row }: TemplateRow): NoteTemplate => {
    let parsed: NoteTemplateContent = EMPTY_CONTENT
    try {
        const value = JSON.parse(content) as NoteTemplateContent
        if (value && Array.isArray(value.groups)) parsed = value
    } catch {
        // A corrupted snapshot behaves as an empty template instead of breaking the whole list
    }
    return { ...row, sourceNoteName: row.sourceNoteName ?? null, content: parsed }
}

/**
 * Builds the template content of a note: an exact copy of its non deleted groups, sections and tasks
 * (subtasks at any depth; a subtask whose ancestor is in the trash is hidden with it). Audio files are not included.
 * @param noteId The ID of the note.
 * @category Database Queries
 */
async function buildContent(noteId: number): Promise<NoteTemplateContent> {
    const { groups, sections, tasks } = await getDBNoteData(noteId)

    const childrenOf = new Map<number, Task[]>()
    const topOf = new Map<number, Task[]>()
    for (const task of tasks) {
        const bucket = task.taskID != null ? childrenOf : topOf
        const key = task.taskID != null ? task.taskID : (task.sectionID as number)
        bucket.set(key, [...(bucket.get(key) ?? []), task])
    }

    const snapshotTask = (task: Task): TemplateTask => ({
        text: task.text,
        description: task.description ?? null,
        completed: !!task.completed,
        priority: !!task.priority,
        archived: !!task.archived,
        color: task.color ?? null,
        position: task.position,
        subtasks: (childrenOf.get(task.id) ?? []).map(snapshotTask),
    })

    const snapshotSection = (section: (typeof sections)[number]): TemplateSection => ({
        title: section.title,
        color: section.color ?? null,
        archived: !!section.archived,
        position: section.position,
        tasks: (topOf.get(section.id) ?? []).map(snapshotTask),
    })

    return {
        version: 1,
        groups: groups.map((group): TemplateGroup => ({
            name: group.name ?? null,
            position: group.position,
            sections: sections.filter(section => section.groupID === group.id).map(snapshotSection),
        })),
    }
}

/**
 * Creates a template from an existing note: an independent, exact snapshot of its content at this moment.
 * @param noteId The ID of the source note (it must not be deleted).
 * @param name The name of the template (unique in the workspace).
 * @returns The ID of the new template.
 * @throws A "TEMPLATE_SOURCE_MISSING" error when the note does not exist, "TEMPLATE_EXISTS" on a name clash.
 * @category Database Queries
 */
export async function createDBTemplateFromNote(noteId: number, name: string): Promise<number> {
    try {
        const db = await getDB()
        const notes = await db.select<{ workspaceID: number, color: string | null }[]>(
            'SELECT workspaceID, color FROM note WHERE id = ? AND deleted_at IS NULL', [noteId])
        if (notes.length === 0)
            throw createError("TEMPLATE_SOURCE_MISSING", SOURCE_MISSING_MESSAGE)

        const content = await buildContent(noteId)
        const result = await db.execute(
            'INSERT INTO note_template (workspaceID, sourceNoteID, name, color, content) VALUES (?, ?, ?, ?, ?)',
            [notes[0].workspaceID, noteId, name.trim(), notes[0].color ?? null, JSON.stringify(content)])
        return result.lastInsertId as number
    } catch (error: unknown) {
        if (isAppError(error)) throw error
        handleDBError(error, "TEMPLATE", { UNIQUE: TEMPLATE_UNIQUE_MESSAGE, CHECK: TEMPLATE_CHECK_MESSAGE })
    }
}

const TEMPLATE_SELECT = `SELECT t.*, n.name AS sourceNoteName FROM note_template t
    LEFT JOIN note n ON n.id = t.sourceNoteID AND n.deleted_at IS NULL`

/**
 * Retrieves the templates of a workspace (not deleted), ordered by name.
 * `sourceNoteName` is null when the source note no longer exists or is in the trash.
 * @param workspaceId The ID of the workspace.
 * @throws A createError('TEMPLATE_LOAD_FAILED') error when the query fails.
 * @category Database Queries
 */
export async function getDBTemplates(workspaceId: number): Promise<NoteTemplate[]> {
    try {
        const db = await getDB()
        const rows = await db.select<TemplateRow[]>(
            `${TEMPLATE_SELECT} WHERE t.workspaceID = ? AND t.deleted_at IS NULL ORDER BY t.name COLLATE NOCASE, t.id`, [workspaceId])
        return rows.map(toTemplate)
    } catch (error: unknown) {
        throw createError("TEMPLATE_LOAD_FAILED", "Failed to load the templates: " + getErrorMessage(error))
    }
}

/**
 * Counts the templates of a workspace (not deleted).
 * @param workspaceId The ID of the workspace.
 * @throws A createError('TEMPLATE_LOAD_FAILED') error when the query fails.
 * @category Database Queries
 */
export async function countDBTemplates(workspaceId: number): Promise<number> {
    try {
        const db = await getDB()
        const rows = await db.select<{ count: number }[]>(
            'SELECT COUNT(*) AS count FROM note_template WHERE workspaceID = ? AND deleted_at IS NULL', [workspaceId])
        return rows[0]?.count ?? 0
    } catch (error: unknown) {
        throw createError("TEMPLATE_LOAD_FAILED", "Failed to load the templates: " + getErrorMessage(error))
    }
}

/**
 * Renames a template.
 * @param templateId The ID of the template.
 * @param name The new name (unique in the workspace).
 * @category Database Queries
 */
export async function renameDBTemplate(templateId: number, name: string) {
    try {
        const db = await getDB()
        await db.execute('UPDATE note_template SET name = ? WHERE id = ?', [name.trim(), templateId])
    } catch (error: unknown) {
        handleDBError(error, "TEMPLATE", { UNIQUE: TEMPLATE_UNIQUE_MESSAGE, CHECK: TEMPLATE_CHECK_MESSAGE })
    }
}

/**
 * Overwrites the snapshot of a template with the current content (and color) of its source note.
 * @param templateId The ID of the template.
 * @throws A "TEMPLATE_SOURCE_MISSING" error when the source note no longer exists or is in the trash.
 * @category Database Queries
 */
export async function updateDBTemplateFromNote(templateId: number) {
    try {
        const db = await getDB()
        const rows = await db.select<{ noteID: number, color: string | null }[]>(
            `SELECT n.id AS noteID, n.color FROM note_template t
             INNER JOIN note n ON n.id = t.sourceNoteID AND n.deleted_at IS NULL
             WHERE t.id = ? AND t.deleted_at IS NULL`, [templateId])
        if (rows.length === 0)
            throw createError("TEMPLATE_SOURCE_MISSING", SOURCE_MISSING_MESSAGE)

        const content = await buildContent(rows[0].noteID)
        await db.execute('UPDATE note_template SET color = ?, content = ? WHERE id = ?',
            [rows[0].color ?? null, JSON.stringify(content), templateId])
    } catch (error: unknown) {
        if (isAppError(error)) throw error
        throw createError("TEMPLATE_UPDATE_FAILED", "Failed to update the template: " + getErrorMessage(error))
    }
}

/**
 * Inserts rows with multi-row INSERT statements and returns their ids in order.
 * A single INSERT runs under the SQLite write lock, so the rows of a statement get consecutive rowids
 * and lastInsertId is the id of the last one.
 * @param db Database instance.
 * @param table Table name.
 * @param columns Column names.
 * @param rows Values of every row.
 * @category Database Queries
 */
async function insertRows(db: Database, table: string, columns: string[], rows: unknown[][]): Promise<number[]> {
    const ids: number[] = []
    const placeholders = `(${columns.map(() => "?").join(", ")})`
    for (let start = 0; start < rows.length; start += INSERT_CHUNK) {
        const chunk = rows.slice(start, start + INSERT_CHUNK)
        const result = await db.execute(
            `INSERT INTO ${table} (${columns.join(", ")}) VALUES ${chunk.map(() => placeholders).join(", ")}`,
            chunk.flat())
        if (result.rowsAffected !== chunk.length || result.lastInsertId === undefined)
            throw new Error(`Unexpected result inserting into ${table}`)
        const last = result.lastInsertId
        for (let i = chunk.length - 1; i >= 0; i--) ids.push(last - i)
    }
    return ids
}

type PendingTask = { sectionID: number, parentID: number | null, task: TemplateTask }

/**
 * Creates a note from a template, appended at the end of the destination (workspace root or folder).
 * Groups, sections and tasks are inserted with one multi-row INSERT per level. The connection pool gives no
 * reliable multi-call transactions, so on any failure the created note is hard deleted (foreign keys cascade
 * to its children) and the error is rethrown.
 * @param templateId The ID of the template.
 * @param workspaceId The ID of the workspace of the new note.
 * @param folderId The destination folder, null for the workspace root.
 * @param name The name of the new note.
 * @returns The ID of the new note.
 * @throws "NOTE_EXISTS" on a name clash in the destination, "TEMPLATE_NOT_FOUND" when the template does not exist.
 * @category Database Queries
 */
export async function createDBNoteFromTemplate(templateId: number, workspaceId: number, folderId: number | null, name: string): Promise<number> {
    let db: Database
    let template: NoteTemplate
    try {
        db = await getDB()
        const rows = await db.select<TemplateRow[]>(
            `${TEMPLATE_SELECT} WHERE t.id = ? AND t.workspaceID = ? AND t.deleted_at IS NULL`, [templateId, workspaceId])
        if (rows.length === 0)
            throw createError("TEMPLATE_NOT_FOUND", "Il template non esiste più.")
        template = toTemplate(rows[0])
    } catch (error: unknown) {
        if (isAppError(error)) throw error
        throw createError("TEMPLATE_LOAD_FAILED", "Failed to load the template: " + getErrorMessage(error))
    }

    let noteId: number
    try {
        const result = folderId === null
            ? await db.execute(
                `INSERT INTO note (workspaceID, name, color, position)
                 SELECT ?, ?, ?, COALESCE(MAX(position) + 1, 0) FROM note
                 WHERE workspaceID = ? AND folderID IS NULL AND deleted_at IS NULL`,
                [workspaceId, name.trim(), template.color, workspaceId])
            : await db.execute(
                `INSERT INTO note (workspaceID, folderID, name, color, position)
                 SELECT ?, ?, ?, ?, COALESCE(MAX(position) + 1, 0) FROM note
                 WHERE folderID = ? AND deleted_at IS NULL`,
                [workspaceId, folderId, name.trim(), template.color, folderId])
        noteId = result.lastInsertId as number
    } catch (error: unknown) {
        handleDBError(error, "NOTE", { UNIQUE: NOTE_UNIQUE_MESSAGE, CHECK: NOTE_CHECK_MESSAGE })
    }

    try {
        const { groups } = template.content
        const groupIds = await insertRows(db, "section_group", ["noteID", "position", "name"],
            groups.map(group => [noteId, group.position, group.name ?? null]))

        const sectionSources = groups.flatMap((group, i) => group.sections.map(section => ({ groupID: groupIds[i], section })))
        const sectionIds = await insertRows(db, "section", ["groupID", "title", "color", "archived", "position"],
            sectionSources.map(({ groupID, section }) => [groupID, section.title, section.color ?? null, section.archived ? 1 : 0, section.position]))

        // Tasks level by level: the subtasks of a level need the ids of their parents
        let level: PendingTask[] = sectionSources.flatMap(({ section }, i) =>
            section.tasks.map(task => ({ sectionID: sectionIds[i], parentID: null, task })))
        while (level.length > 0) {
            const ids = await insertRows(db, "task",
                ["sectionID", "taskID", "text", "description", "completed", "priority", "archived", "color", "position"],
                level.map(({ sectionID, parentID, task }) => [
                    sectionID, parentID, task.text, task.description ?? null, task.completed ? 1 : 0,
                    task.priority ? 1 : 0, task.archived ? 1 : 0, task.color ?? null, task.position,
                ]))
            level = level.flatMap(({ sectionID, task }, i) =>
                task.subtasks.map(subtask => ({ sectionID, parentID: ids[i], task: subtask })))
        }
        return noteId
    } catch (error: unknown) {
        // Remove the partial note, transactions are unreliable with the connection pool
        await db.execute('DELETE FROM note WHERE id = ?', [noteId]).catch(() => undefined)
        throw createError("TEMPLATE_APPLY_FAILED", "Failed to create the note from the template: " + getErrorMessage(error))
    }
}
