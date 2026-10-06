import i18n from "@/i18n"
import type { Task } from "@/types/types"
import { createError, handleDBError, isAppError } from "@/types/error"
import { getErrorMessage } from "@/lib/utils"
import { getDB } from "../dbManager"
import { Transaction, TransactionError } from "../transaction"
import { addNoteContent, addSections, buildContent, createSectionSnapshotter } from "./template"

/**
 * The name of a copy: "<name> (copy)", then "<name> (copy 2)", "<name> (copy 3)"... the first one not in `taken`.
 * The word comes from the current language.
 * @param name The name of the original.
 * @param taken The names already used among the siblings.
 * @category Database Queries
 */
export function uniqueCopyName(name: string, taken: ReadonlySet<string>): string {
    const word = i18n.t("duplicate.suffix")
    let candidate = `${name} (${word})`
    for (let n = 2; taken.has(candidate); n++) candidate = `${name} (${word} ${n})`
    return candidate
}

type NoteRow = { workspaceID: number, folderID: number | null, name: string, color: string | null, position: number }
type SectionRow = { groupID: number, title: string, color: string | null, position: number, id: number }

/**
 * Duplicates a note in the same workspace and folder, right after the original (the following siblings shift by one).
 * The copy is named "<name> (copy)" ("(copy 2)"... when taken), has the same color and an exact copy of the non deleted
 * groups, sections, tasks and subtasks. Audio files are not copied. Everything is written in ONE database transaction.
 * @param noteId The ID of the note to duplicate (it must not be deleted).
 * @returns The ID of the new note.
 * @throws "DUPLICATE_SOURCE_MISSING" when the note does not exist, "NOTE_EXISTS" on a name clash, "DUPLICATE_FAILED" otherwise.
 * @category Database Queries
 */
export async function duplicateDBNote(noteId: number): Promise<number> {
    let source: NoteRow
    let name: string
    let content: Awaited<ReturnType<typeof buildContent>>
    try {
        const db = await getDB()
        const rows = await db.select<NoteRow[]>(
            'SELECT workspaceID, folderID, name, color, position FROM note WHERE id = ? AND deleted_at IS NULL', [noteId])
        if (rows.length === 0)
            throw createError("DUPLICATE_SOURCE_MISSING", i18n.t("errors.duplicate.noteMissing"))
        source = rows[0]
        const siblings = await db.select<{ name: string }[]>(
            'SELECT name FROM note WHERE workspaceID = ? AND IFNULL(folderID, 0) = ? AND deleted_at IS NULL',
            [source.workspaceID, source.folderID ?? 0])
        name = uniqueCopyName(source.name, new Set(siblings.map(row => row.name)))
        content = await buildContent(noteId)
    } catch (error: unknown) {
        if (isAppError(error)) throw error
        throw createError("DUPLICATE_FAILED", i18n.t("errors.duplicate.load", { message: getErrorMessage(error) }))
    }

    const tx = new Transaction()
    tx.add(
        'UPDATE note SET position = position + 1 WHERE workspaceID = ? AND IFNULL(folderID, 0) = ? AND position > ? AND deleted_at IS NULL',
        [source.workspaceID, source.folderID ?? 0, source.position])
    const note = tx.add(
        'INSERT INTO note (workspaceID, folderID, name, color, position) VALUES (?, ?, ?, ?, ?)',
        [source.workspaceID, source.folderID, name, source.color, source.position + 1])
    addNoteContent(tx, tx.idOf(note), content)

    try {
        const results = await tx.run()
        return results[note].lastInsertId
    } catch (error: unknown) {
        if (error instanceof TransactionError && error.statementIndex === note)
            handleDBError(error, "NOTE", { UNIQUE: i18n.t("errors.template.noteUnique"), CHECK: i18n.t("errors.template.noteCheck") })
        throw createError("DUPLICATE_FAILED", i18n.t("errors.duplicate.apply", { message: getErrorMessage(error) }))
    }
}

/**
 * Duplicates a section in the same group, right after the original (the following sections shift by one).
 * The copy is titled "<title> (copy)" ("(copy 2)"... when taken) and has the same color and an exact
 * copy of the non deleted tasks and subtasks. Everything is written in ONE database transaction.
 * @param sectionId The ID of the section to duplicate (it must not be deleted).
 * @returns The ID of the new section.
 * @throws "DUPLICATE_SOURCE_MISSING" when the section does not exist, "SECTION_EXISTS" on a title clash, "DUPLICATE_FAILED" otherwise.
 * @category Database Queries
 */
export async function duplicateDBSection(sectionId: number): Promise<number> {
    let source: SectionRow
    let title: string
    let snapshot: ReturnType<ReturnType<typeof createSectionSnapshotter>>
    try {
        const db = await getDB()
        const rows = await db.select<SectionRow[]>(
            'SELECT id, groupID, title, color, position FROM section WHERE id = ? AND deleted_at IS NULL', [sectionId])
        if (rows.length === 0)
            throw createError("DUPLICATE_SOURCE_MISSING", i18n.t("errors.duplicate.sectionMissing"))
        source = rows[0]
        const siblings = await db.select<{ title: string }[]>(
            'SELECT title FROM section WHERE groupID = ? AND deleted_at IS NULL', [source.groupID])
        title = uniqueCopyName(source.title, new Set(siblings.map(row => row.title)))
        const tasks = await db.select<Task[]>(
            'SELECT * FROM task WHERE sectionID = ? AND deleted_at IS NULL ORDER BY position, id', [sectionId])
        snapshot = createSectionSnapshotter(tasks)(source)
    } catch (error: unknown) {
        if (isAppError(error)) throw error
        throw createError("DUPLICATE_FAILED", i18n.t("errors.duplicate.load", { message: getErrorMessage(error) }))
    }

    const tx = new Transaction()
    tx.add('UPDATE section SET position = position + 1 WHERE groupID = ? AND position > ? AND deleted_at IS NULL',
        [source.groupID, source.position])
    const [sectionRef] = addSections(tx, [{ groupRef: source.groupID, section: { ...snapshot, title, position: source.position + 1 } }])
    const sectionStatement = sectionRef.$ref

    try {
        const results = await tx.run()
        return results[sectionStatement].lastInsertId
    } catch (error: unknown) {
        if (error instanceof TransactionError && error.statementIndex === sectionStatement)
            handleDBError(error, "SECTION", { UNIQUE: i18n.t("errors.section.unique"), CHECK: i18n.t("errors.section.check") })
        throw createError("DUPLICATE_FAILED", i18n.t("errors.duplicate.apply", { message: getErrorMessage(error) }))
    }
}
