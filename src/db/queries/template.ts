import i18n from "@/i18n"
import type { NoteTemplate, NoteTemplateContent, TemplateGroup, TemplateSection, TemplateTask } from "@/types/template";
import type { Section, Task } from "@/types/types";
import { createError, handleDBError, isAppError } from "@/types/error";
import { getErrorMessage } from "@/lib/utils";
import { getDB } from "../dbManager";
import { Transaction, TransactionError, type TxRef } from "../transaction";
import { getDBNoteData } from "./note";

const TEMPLATE_UNIQUE_MESSAGE = () => i18n.t("errors.template.unique")
const TEMPLATE_CHECK_MESSAGE = () => i18n.t("errors.template.check")
const NOTE_UNIQUE_MESSAGE = () => i18n.t("errors.template.noteUnique")
const NOTE_CHECK_MESSAGE = () => i18n.t("errors.template.noteCheck")
const SOURCE_MISSING_MESSAGE = () => i18n.t("errors.template.sourceMissing")

type TemplateRow = Omit<NoteTemplate, "content"> & { content: string }

const EMPTY_CONTENT: NoteTemplateContent = { version: 1, groups: [] }

/**
 * Parses the JSON snapshot stored in a template. A corrupted or malformed snapshot behaves as an empty template
 * instead of breaking the whole list.
 * @param json The content column of a note_template row.
 * @category Database Queries
 */
export function parseTemplateContent(json: string): NoteTemplateContent {
    try {
        const value = JSON.parse(json) as NoteTemplateContent
        if (value && Array.isArray(value.groups)) return value
    } catch {
        // Falls through to the empty template
    }
    return EMPTY_CONTENT
}

const toTemplate = ({ content, ...row }: TemplateRow): NoteTemplate =>
    ({ ...row, sourceNoteName: row.sourceNoteName ?? null, content: parseTemplateContent(content) })

/**
 * Returns a function that snapshots a section (with its tasks and subtasks at any depth) out of a list of tasks.
 * A subtask whose ancestor is not in the list is left out with it.
 * @param tasks The (non deleted) tasks of the sections that will be snapshotted.
 * @category Database Queries
 */
export function createSectionSnapshotter(tasks: Task[]): (section: Pick<Section, "id" | "title" | "color" | "archived_at" | "position">) => TemplateSection {
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
        color: task.color ?? null,
        position: task.position,
        subtasks: (childrenOf.get(task.id) ?? []).map(snapshotTask),
    })

    return section => ({
        title: section.title,
        color: section.color ?? null,
        ...(section.archived_at ? { archived_at: section.archived_at } : {}),
        position: section.position,
        tasks: (topOf.get(section.id) ?? []).map(snapshotTask),
    })
}

/**
 * Builds the template content of a note: an exact copy of its visible groups, sections and tasks (neither deleted nor
 * archived; subtasks at any depth; a subtask whose ancestor is in the trash is hidden with it). Audio files are not included.
 * @param noteId The ID of the note.
 * @param includeArchived Keeps the archived groups and sections, with their `archived_at` (used by the export; default false).
 * @category Database Queries
 */
export async function buildContent(noteId: number, includeArchived = false): Promise<NoteTemplateContent> {
    const { groups, sections, tasks } = await getDBNoteData(noteId, includeArchived)
    const snapshotSection = createSectionSnapshotter(tasks)

    return {
        version: 1,
        groups: groups.map((group): TemplateGroup => ({
            name: group.name ?? null,
            color: group.color ?? null,
            ...(group.archived_at ? { archived_at: group.archived_at } : {}),
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
            throw createError("TEMPLATE_SOURCE_MISSING", SOURCE_MISSING_MESSAGE())

        const content = await buildContent(noteId)
        const result = await db.execute(
            'INSERT INTO note_template (workspaceID, sourceNoteID, name, color, content) VALUES (?, ?, ?, ?, ?)',
            [notes[0].workspaceID, noteId, name.trim(), notes[0].color ?? null, JSON.stringify(content)])
        return result.lastInsertId as number
    } catch (error: unknown) {
        if (isAppError(error)) throw error
        handleDBError(error, "TEMPLATE", { UNIQUE: TEMPLATE_UNIQUE_MESSAGE(), CHECK: TEMPLATE_CHECK_MESSAGE() })
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
        throw createError("TEMPLATE_LOAD_FAILED", i18n.t("errors.template.loadAll", { message: getErrorMessage(error) }))
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
        throw createError("TEMPLATE_LOAD_FAILED", i18n.t("errors.template.loadAll", { message: getErrorMessage(error) }))
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
        handleDBError(error, "TEMPLATE", { UNIQUE: TEMPLATE_UNIQUE_MESSAGE(), CHECK: TEMPLATE_CHECK_MESSAGE() })
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
            throw createError("TEMPLATE_SOURCE_MISSING", SOURCE_MISSING_MESSAGE())

        const content = await buildContent(rows[0].noteID)
        await db.execute('UPDATE note_template SET color = ?, content = ? WHERE id = ?',
            [rows[0].color ?? null, JSON.stringify(content), templateId])
    } catch (error: unknown) {
        if (isAppError(error)) throw error
        throw createError("TEMPLATE_UPDATE_FAILED", i18n.t("errors.template.update", { message: getErrorMessage(error) }))
    }
}

type PendingTask = { sectionRef: TxRef, parentRef: TxRef | null, task: TemplateTask }

/**
 * Adds to a transaction the statements that insert the groups, sections and tasks of a content snapshot
 * into a note, with one multi-row INSERT per level. Nothing runs until the transaction is run.
 * @param tx The transaction collecting the statements.
 * @param noteRef The note: its id or a reference to the statement that creates it.
 * @param content The content to insert.
 * @returns References to the created groups, in the order of `content.groups`.
 * @category Database Queries
 */
export function addNoteContent(tx: Transaction, noteRef: number | TxRef, content: NoteTemplateContent): TxRef[] {
    const { groups } = content
    const groupRefs = tx.insertRows("section_group", ["noteID", "position", "name", "color", "archived_at"],
        groups.map(group => [noteRef, group.position, group.name ?? null, group.color || null, group.archived_at || null]))

    addSections(tx, groups.flatMap((group, i) => group.sections.map(section => ({ groupRef: groupRefs[i], section }))))
    return groupRefs
}

/**
 * Adds to a transaction the statements that insert sections (with their tasks and subtasks) into existing or
 * to-be-created groups, with one multi-row INSERT per level.
 * @param tx The transaction collecting the statements.
 * @param sources The sections and the group each one goes into (its id or a reference to the statement that creates it).
 * @returns References to the created sections, in the order of `sources`.
 * @category Database Queries
 */
export function addSections(tx: Transaction, sources: { groupRef: number | TxRef, section: TemplateSection }[]): TxRef[] {
    const sectionRefs = tx.insertRows("section", ["groupID", "title", "color", "archived_at", "position"],
        sources.map(({ groupRef, section }) => [groupRef, section.title, section.color ?? null, section.archived_at || null, section.position]))

    // Tasks level by level: the subtasks of a level reference the ids of their parents
    let level: PendingTask[] = sources.flatMap(({ section }, i) =>
        section.tasks.map(task => ({ sectionRef: sectionRefs[i], parentRef: null, task })))
    while (level.length > 0) {
        const refs = tx.insertRows("task",
            ["sectionID", "taskID", "text", "description", "completed", "priority", "color", "position"],
            level.map(({ sectionRef, parentRef, task }) => [
                sectionRef, parentRef, task.text, task.description ?? null, task.completed ? 1 : 0,
                task.priority ? 1 : 0, task.color ?? null, task.position,
            ]))
        level = level.flatMap(({ sectionRef, task }, i) =>
            task.subtasks.map(subtask => ({ sectionRef, parentRef: refs[i], task: subtask })))
    }
    return sectionRefs
}

/**
 * Creates a note from a template, appended at the end of the destination (workspace root or folder).
 * The note and all its groups, sections and tasks (one multi-row INSERT per level) are written in ONE database
 * transaction: on any failure nothing is created.
 * @param templateId The ID of the template.
 * @param workspaceId The ID of the workspace of the new note.
 * @param folderId The destination folder, null for the workspace root.
 * @param name The name of the new note.
 * @returns The ID of the new note.
 * @throws "NOTE_EXISTS" on a name clash in the destination, "TEMPLATE_NOT_FOUND" when the template does not exist,
 * "TEMPLATE_APPLY_FAILED" when the content cannot be inserted.
 * @category Database Queries
 */
export async function createDBNoteFromTemplate(templateId: number, workspaceId: number, folderId: number | null, name: string): Promise<number> {
    let template: NoteTemplate
    try {
        const db = await getDB()
        const rows = await db.select<TemplateRow[]>(
            `${TEMPLATE_SELECT} WHERE t.id = ? AND t.workspaceID = ? AND t.deleted_at IS NULL`, [templateId, workspaceId])
        if (rows.length === 0)
            throw createError("TEMPLATE_NOT_FOUND", i18n.t("errors.template.notFound"))
        template = toTemplate(rows[0])
    } catch (error: unknown) {
        if (isAppError(error)) throw error
        throw createError("TEMPLATE_LOAD_FAILED", i18n.t("errors.template.load", { message: getErrorMessage(error) }))
    }

    const tx = new Transaction()
    const note = folderId === null
        ? tx.add(
            `INSERT INTO note (workspaceID, name, color, position)
             SELECT ?, ?, ?, COALESCE(MAX(position) + 1, 0) FROM note
             WHERE workspaceID = ? AND folderID IS NULL AND deleted_at IS NULL`,
            [workspaceId, name.trim(), template.color, workspaceId])
        : tx.add(
            `INSERT INTO note (workspaceID, folderID, name, color, position)
             SELECT ?, ?, ?, ?, COALESCE(MAX(position) + 1, 0) FROM note
             WHERE folderID = ? AND deleted_at IS NULL`,
            [workspaceId, folderId, name.trim(), template.color, folderId])
    addNoteContent(tx, tx.idOf(note), template.content)

    try {
        const results = await tx.run()
        return results[note].lastInsertId
    } catch (error: unknown) {
        // Statement 0 is the note itself: its failures are name clashes / invalid names
        if (error instanceof TransactionError && error.statementIndex === note)
            handleDBError(error, "NOTE", { UNIQUE: NOTE_UNIQUE_MESSAGE(), CHECK: NOTE_CHECK_MESSAGE() })
        throw createError("TEMPLATE_APPLY_FAILED", i18n.t("errors.template.apply", { message: getErrorMessage(error) }))
    }
}
