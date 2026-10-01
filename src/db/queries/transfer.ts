import i18n from "@/i18n"
import type Database from "@tauri-apps/plugin-sql";
import { exists } from "@tauri-apps/plugin-fs";
import type { Folder, Note, Workspace } from "@/types/types";
import type { NoteTemplateContent } from "@/types/template";
import {
    WORKSPACE_EXPORT_FORMAT, WORKSPACE_EXPORT_VERSION,
    type ExportAudio, type ExportFolder, type ExportNote, type ExportTemplate, type WorkspaceExport,
} from "@/types/transfer";
import { createError, handleDBError } from "@/types/error";
import { getErrorMessage } from "@/lib/utils";
import { getDB } from "../dbManager";
import { addNoteContent, buildContent } from "./template";
import { Transaction, TransactionError, type TxRef } from "../transaction";

const INVALID_FILE_MESSAGE = () => i18n.t("errors.transfer.invalidFile")
const MALFORMED_MESSAGE = () => i18n.t("errors.transfer.malformed")

// Errors built with createError are plain objects; driver errors (Error instances of any realm, or strings) must not match
const isAppError = (error: unknown): error is { code: string, message: string } =>
    typeof error === "object" && error !== null && Object.getPrototypeOf(error) === Object.prototype && "code" in error && "message" in error

/**
 * Builds the export of a workspace: folders, notes (with content and audio paths) and templates, without any trashed item.
 * @param workspaceId The ID of the workspace.
 * @throws A "TRANSFER_WORKSPACE_MISSING" error when the workspace does not exist, "TRANSFER_EXPORT_FAILED" otherwise.
 * @category Database Queries
 */
export async function buildDBWorkspaceExport(workspaceId: number): Promise<WorkspaceExport> {
    try {
        const db = await getDB()
        const workspaces = await db.select<Workspace[]>(
            'SELECT * FROM workspace WHERE id = ? AND deleted_at IS NULL', [workspaceId])
        if (workspaces.length === 0)
            throw createError("TRANSFER_WORKSPACE_MISSING", i18n.t("errors.transfer.workspaceMissing"))

        const folders = await db.select<(Folder & { color: string | null })[]>(
            'SELECT * FROM folder WHERE workspaceID = ? AND deleted_at IS NULL ORDER BY position, id', [workspaceId])
        const notes = await db.select<(Note & { color: string | null })[]>(
            'SELECT * FROM note WHERE workspaceID = ? AND deleted_at IS NULL ORDER BY position, id', [workspaceId])
        const templates = await db.select<{ name: string, color: string | null, content: string }[]>(
            'SELECT name, color, content FROM note_template WHERE workspaceID = ? AND deleted_at IS NULL ORDER BY name COLLATE NOCASE, id',
            [workspaceId])

        // An item inside a trashed folder is hidden with it: it is exported only when its whole folder chain is alive
        const folderById = new Map(folders.map(folder => [folder.id, folder]))
        const isReachable = (folderId: number | null): boolean => {
            const seen = new Set<number>()
            while (folderId !== null) {
                const folder = folderById.get(folderId)
                if (!folder || seen.has(folderId)) return false
                seen.add(folderId)
                folderId = folder.folderID
            }
            return true
        }
        const refOf = (folderId: number | null) => folderId === null ? null : `f${folderId}`

        const exportFolders: ExportFolder[] = folders.filter(folder => isReachable(folder.id)).map(folder => ({
            ref: `f${folder.id}`,
            parentRef: refOf(folder.folderID),
            name: folder.name,
            color: folder.color ?? null,
            position: folder.position,
        }))

        const exportNotes: ExportNote[] = []
        for (const note of notes.filter(note => isReachable(note.folderID))) {
            const content = await buildContent(note.id)
            const audio = await db.select<{ section_groupID: number, name: string, path: string, position: number }[]>(
                `SELECT a.section_groupID, a.name, a.path, a.position FROM audio_file a
                 INNER JOIN section_group g ON g.id = a.section_groupID
                 WHERE g.noteID = ? AND g.deleted_at IS NULL AND a.deleted_at IS NULL
                 ORDER BY a.position, a.id`, [note.id])
            // Group ids in content order (same criteria as buildContent: not deleted, by position)
            const groupRows = await db.select<{ id: number }[]>(
                'SELECT id FROM section_group WHERE noteID = ? AND deleted_at IS NULL ORDER BY position', [note.id])
            const groupIndex = new Map(groupRows.map((row, index) => [row.id, index]))
            exportNotes.push({
                ref: `n${note.id}`,
                folderRef: refOf(note.folderID),
                name: note.name,
                color: note.color ?? null,
                position: note.position,
                content,
                audio: audio.flatMap((file): ExportAudio[] => {
                    const index = groupIndex.get(file.section_groupID)
                    return index === undefined ? [] : [{ groupIndex: index, name: file.name, path: file.path, position: file.position }]
                }),
            })
        }

        const exportTemplates: ExportTemplate[] = templates.map(template => {
            let content: NoteTemplateContent = { version: 1, groups: [] }
            try {
                const value = JSON.parse(template.content) as NoteTemplateContent
                if (value && Array.isArray(value.groups)) content = value
            } catch {
                // A corrupted snapshot is exported as an empty template
            }
            return { name: template.name, color: template.color ?? null, content }
        })

        return {
            format: WORKSPACE_EXPORT_FORMAT,
            version: WORKSPACE_EXPORT_VERSION,
            exportedAt: new Date().toISOString(),
            workspace: { name: workspaces[0].name, color: workspaces[0].color ?? null },
            folders: exportFolders,
            notes: exportNotes,
            templates: exportTemplates,
        }
    } catch (error: unknown) {
        if (isAppError(error)) throw error
        throw createError("TRANSFER_EXPORT_FAILED", i18n.t("errors.transfer.export", { message: getErrorMessage(error) }))
    }
}

const isObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value)
const isString = (value: unknown): value is string => typeof value === "string"
const isNonEmpty = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0
const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value)
const isNullableString = (value: unknown) => value === null || value === undefined || isString(value)

function malformed(): never {
    throw createError("TRANSFER_INVALID_FILE", MALFORMED_MESSAGE())
}

function checkTask(task: unknown, depth = 0) {
    if (!isObject(task) || depth > 100) malformed()
    if (!isString(task.text) || !isNumber(task.position) || !Array.isArray(task.subtasks)) malformed()
    if (!isNullableString(task.description) || !isNullableString(task.color)) malformed()
    for (const subtask of task.subtasks as unknown[]) checkTask(subtask, depth + 1)
}

/** Checks a note content so that the insertion never crashes on a malformed file. */
function checkContent(content: unknown): NoteTemplateContent {
    if (!isObject(content) || !Array.isArray(content.groups)) malformed()
    for (const group of content.groups as unknown[]) {
        if (!isObject(group) || !isNumber(group.position) || !Array.isArray(group.sections) || !isNullableString(group.name)
            || !isNullableString(group.color)) malformed()
        for (const section of group.sections as unknown[]) {
            if (!isObject(section) || !isString(section.title) || !isNumber(section.position) || !Array.isArray(section.tasks)
                || !isNullableString(section.color)) malformed()
            for (const task of section.tasks as unknown[]) checkTask(task)
        }
    }
    return content as unknown as NoteTemplateContent
}

/**
 * Validates the parsed content of an export file.
 * @param data The parsed JSON.
 * @returns The same data, typed.
 * @throws A "TRANSFER_INVALID_FILE" error (Italian message) for a wrong format or malformed structure,
 * "TRANSFER_UNSUPPORTED_VERSION" for an unsupported version.
 * @category Database Queries
 */
export function validateWorkspaceExport(data: unknown): WorkspaceExport {
    if (!isObject(data) || data.format !== WORKSPACE_EXPORT_FORMAT)
        throw createError("TRANSFER_INVALID_FILE", INVALID_FILE_MESSAGE())
    if (data.version !== WORKSPACE_EXPORT_VERSION)
        throw createError("TRANSFER_UNSUPPORTED_VERSION", i18n.t("errors.transfer.unsupportedVersion"))

    const { workspace, folders, notes, templates } = data
    if (!isObject(workspace) || !isNonEmpty(workspace.name) || !isNullableString(workspace.color)) malformed()
    if (!Array.isArray(folders) || !Array.isArray(notes) || !Array.isArray(templates)) malformed()

    const folderRefs = new Set<string>()
    for (const folder of folders as unknown[]) {
        if (!isObject(folder) || !isNonEmpty(folder.ref) || !isNonEmpty(folder.name) || !isNumber(folder.position)
            || !isNullableString(folder.color) || !(folder.parentRef === null || isString(folder.parentRef))) malformed()
        if (folderRefs.has(folder.ref)) malformed()
        folderRefs.add(folder.ref)
    }
    for (const folder of folders as ExportFolder[])
        if (folder.parentRef !== null && !folderRefs.has(folder.parentRef)) malformed()

    const noteRefs = new Set<string>()
    for (const note of notes as unknown[]) {
        if (!isObject(note) || !isNonEmpty(note.ref) || !isNonEmpty(note.name) || !isNumber(note.position)
            || !isNullableString(note.color) || !Array.isArray(note.audio)
            || !(note.folderRef === null || (isString(note.folderRef) && folderRefs.has(note.folderRef)))) malformed()
        if (noteRefs.has(note.ref)) malformed()
        noteRefs.add(note.ref)
        const content = checkContent(note.content)
        for (const audio of note.audio as unknown[]) {
            if (!isObject(audio) || !isNumber(audio.groupIndex) || !isNonEmpty(audio.name) || !isNonEmpty(audio.path)
                || !isNumber(audio.position) || audio.groupIndex < 0 || audio.groupIndex >= content.groups.length) malformed()
        }
    }
    for (const template of templates as unknown[]) {
        if (!isObject(template) || !isNonEmpty(template.name) || !isNullableString(template.color)) malformed()
        checkContent(template.content)
    }
    return data as unknown as WorkspaceExport
}

/**
 * Default check for the audio files of an import. `exists` is scoped by the capabilities to the EasyTask folder,
 * so a permission error says nothing about the file: it is treated as present (the row is kept, the app already
 * handles a missing audio file at playback). Only a definite `false` skips the file.
 * @param path Absolute path of the audio file.
 * @category Database Queries
 */
async function defaultAudioExists(path: string): Promise<boolean> {
    try {
        return await exists(path)
    } catch {
        return true
    }
}

/** Returns the first free workspace name: "name", "name (importato)", "name (importato 2)"... */
async function uniqueWorkspaceName(db: Database, name: string): Promise<string> {
    // Trashed workspaces are included: they still hold the UNIQUE constraint on the name
    const rows = await db.select<{ name: string }[]>('SELECT name FROM workspace')
    const used = new Set(rows.map(row => row.name.toLowerCase()))
    if (!used.has(name.toLowerCase())) return name
    for (let counter = 1; ; counter++) {
        const candidate = counter === 1 ? `${name} (importato)` : `${name} (importato ${counter})`
        if (!used.has(candidate.toLowerCase())) return candidate
    }
}

type PendingFolder = { folder: ExportFolder, parentRef: TxRef | null }

/**
 * Imports an export as a new workspace. The name is made unique ("name (importato)", "name (importato 2)"...).
 * The workspace and everything in it are written in ONE database transaction: on any failure nothing is created.
 * @param data A validated export (see validateWorkspaceExport).
 * @param options `audioExists` decides whether an audio file is kept (files for which it returns false or throws are skipped).
 * @returns The ID of the new workspace and the number of skipped audio files.
 * @category Database Queries
 */
export async function importDBWorkspace(
    data: WorkspaceExport,
    options: { audioExists?: (path: string) => Promise<boolean> } = {},
): Promise<{ workspaceId: number, skippedAudio: number }> {
    const audioExists = options.audioExists ?? defaultAudioExists
    const tx = new Transaction()
    let workspace: number
    try {
        const db = await getDB()
        const name = await uniqueWorkspaceName(db, data.workspace.name.trim())
        workspace = tx.add('INSERT INTO workspace (name, color) VALUES (?, ?)', [name, data.workspace.color ?? null])
    } catch (error: unknown) {
        handleDBError(error, "WORKSPACE", {
            UNIQUE: i18n.t("errors.workspace.unique"),
            CHECK: i18n.t("errors.workspace.check"),
        })
    }

    let skippedAudio = 0
    try {
        const workspaceRef = tx.idOf(workspace)
        // Folders level by level: children reference the ids of their parents
        const folderRefs = new Map<string, TxRef>()
        let level: PendingFolder[] = data.folders.filter(folder => folder.parentRef === null).map(folder => ({ folder, parentRef: null }))
        let imported = 0
        while (level.length > 0) {
            const refs = tx.insertRows("folder", ["workspaceID", "folderID", "name", "color", "position"],
                level.map(({ folder, parentRef }) => [workspaceRef, parentRef, folder.name.trim(), folder.color ?? null, folder.position]))
            level.forEach(({ folder }, i) => folderRefs.set(folder.ref, refs[i]))
            imported += level.length
            level = level.flatMap(({ folder }, i) =>
                data.folders.filter(child => child.parentRef === folder.ref).map(child => ({ folder: child, parentRef: refs[i] })))
        }
        // Folders left out are part of a parent cycle
        if (imported !== data.folders.length) throw new Error("Invalid folder tree")

        if (data.notes.length > 0) {
            const noteRefs = tx.insertRows("note", ["workspaceID", "folderID", "name", "color", "position"],
                data.notes.map(note => [
                    workspaceRef, note.folderRef === null ? null : folderRefs.get(note.folderRef) ?? null,
                    note.name.trim(), note.color ?? null, note.position,
                ]))

            for (const [i, note] of data.notes.entries()) {
                const groupRefs = addNoteContent(tx, noteRefs[i], note.content)
                const rows: unknown[][] = []
                const taken = new Set<string>()
                for (const file of note.audio) {
                    let keep: boolean
                    try {
                        keep = await audioExists(file.path)
                    } catch {
                        keep = false
                    }
                    // UNIQUE(name, section_groupID): a duplicated name in the file is skipped instead of failing the import
                    const key = `${file.groupIndex} ${file.name.toLowerCase()}`
                    if (!keep || taken.has(key)) {
                        skippedAudio += 1
                        continue
                    }
                    taken.add(key)
                    rows.push([groupRefs[file.groupIndex], file.name, file.path, file.position])
                }
                if (rows.length > 0) tx.insertRows("audio_file", ["section_groupID", "name", "path", "position"], rows)
            }
        }

        if (data.templates.length > 0) {
            tx.insertRows("note_template", ["workspaceID", "sourceNoteID", "name", "color", "content"],
                data.templates.map(template => [workspaceRef, null, template.name.trim(), template.color ?? null, JSON.stringify(template.content)]))
        }

        const results = await tx.run()
        return { workspaceId: results[workspace].lastInsertId, skippedAudio }
    } catch (error: unknown) {
        // Statement 0 is the workspace row itself: a name clash (race with another writer) or an invalid name
        if (error instanceof TransactionError && error.statementIndex === workspace)
            handleDBError(error, "WORKSPACE", {
                UNIQUE: i18n.t("errors.workspace.unique"),
                CHECK: i18n.t("errors.workspace.check"),
            })
        throw createError("TRANSFER_IMPORT_FAILED", i18n.t("errors.transfer.import", { message: getErrorMessage(error) }))
    }
}
