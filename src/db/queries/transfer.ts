import i18n from "@/i18n"
import type Database from "@tauri-apps/plugin-sql";
import { invoke } from "@tauri-apps/api/core";
import type { Folder, Note, Workspace } from "@/types/types";
import type { NoteTemplateContent } from "@/types/template";
import {
    MAX_IMPORT_ITEMS, WORKSPACE_EXPORT_FORMAT, WORKSPACE_EXPORT_VERSION,
    type ExportAudio, type ExportFolder, type ExportNote, type ExportTemplate, type WorkspaceExport,
} from "@/types/transfer";
import { createError, handleDBError, isAppError } from "@/types/error";
import { getErrorMessage } from "@/lib/utils";
import { getDB } from "../dbManager";
import { AUDIO_EXTENSIONS } from "./audio";
import { isPortableAutomation } from "@/lib/automations/portable";
import { addNoteContent, buildContentWithSectionIds, parseTemplateContent } from "./template";
import { addNoteAutomations, getDBPortableAutomations } from "./automation";
import { Transaction, TransactionError, type TxRef } from "../transaction";

const INVALID_FILE_MESSAGE = () => i18n.t("errors.transfer.invalidFile")
const MALFORMED_MESSAGE = () => i18n.t("errors.transfer.malformed")

/** Exports one note (content and audio paths); `folderRef` is where the note sits inside the file. */
async function buildNoteExport(db: Database, note: Note & { color: string | null }, folderRef: string | null): Promise<ExportNote> {
    const { content, sectionIds, groupIds } = await buildContentWithSectionIds(note.id, true)
    const automations = await getDBPortableAutomations(note.id, content, sectionIds, groupIds)
    const audio = await db.select<{ section_groupID: number, name: string, path: string, position: number }[]>(
        `SELECT a.section_groupID, a.name, a.path, a.position FROM audio_file a
         INNER JOIN section_group g ON g.id = a.section_groupID
         WHERE g.noteID = ? AND g.deleted_at IS NULL AND a.deleted_at IS NULL
         ORDER BY a.position, a.id`, [note.id])
    // Group ids in content order (same criteria as buildContent with the archived: not deleted, by position)
    const groupRows = await db.select<{ id: number }[]>(
        'SELECT id FROM section_group WHERE noteID = ? AND deleted_at IS NULL ORDER BY position', [note.id])
    const groupIndex = new Map(groupRows.map((row, index) => [row.id, index]))
    return {
        ref: `n${note.id}`,
        folderRef,
        name: note.name,
        color: note.color ?? null,
        ...(note.archived_at ? { archived_at: note.archived_at } : {}),
        position: note.position,
        content,
        ...(automations.length > 0 ? { automations } : {}),
        audio: audio.flatMap((file): ExportAudio[] => {
            const index = groupIndex.get(file.section_groupID)
            return index === undefined ? [] : [{ groupIndex: index, name: file.name, path: file.path, position: file.position }]
        }),
    }
}

/**
 * Builds the export of a workspace: folders, notes (with content and audio paths) and templates, without any trashed item
 * (archived items are included, with their `archived_at`).
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
            ...(folder.archived_at ? { archived_at: folder.archived_at } : {}),
            position: folder.position,
        }))

        const exportNotes: ExportNote[] = []
        for (const note of notes.filter(note => isReachable(note.folderID)))
            exportNotes.push(await buildNoteExport(db, note, refOf(note.folderID)))

        const exportTemplates: ExportTemplate[] = templates.map(template => {
            // A corrupted snapshot is exported as an empty template
            return { name: template.name, color: template.color ?? null, content: parseTemplateContent(template.content) }
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

/**
 * Builds the export of a single note, or of a folder with its whole subtree (subfolders and notes, without any trashed item).
 * The file is a "mini workspace" (`scope: "items"`): `workspace` holds the name and color of the item, the item itself sits at
 * the root of the file (parentRef / folderRef null) and `templates` is empty.
 * @param itemType "note" or "folder".
 * @param itemId The ID of the note or folder.
 * @throws A "TRANSFER_ITEM_MISSING" error when the item does not exist (or is trashed), "TRANSFER_EXPORT_FAILED" otherwise.
 * @category Database Queries
 */
export async function buildDBItemExport(itemType: "note" | "folder", itemId: number): Promise<WorkspaceExport> {
    return buildDBItemsExport([{ type: itemType, id: itemId }])
}

/**
 * Builds the export of several notes and folders (each folder with its whole subtree) in ONE file with scope "items",
 * the same format as the export of a single item: every selected item sits at the root of the file, in the given order.
 * An item that is inside another selected folder is not exported twice (it comes with that folder), and so is a repeated one.
 * `workspace` carries `name` and, for a single item, the color of that item.
 * @param items The notes and folders to export (at least one).
 * @param name The name stored in the file; defaults to the name of the first item.
 * @throws A "TRANSFER_ITEM_MISSING" error when an item does not exist (or is trashed), "TRANSFER_EXPORT_FAILED" otherwise.
 * @category Database Queries
 */
export async function buildDBItemsExport(items: { type: "note" | "folder", id: number }[], name?: string): Promise<WorkspaceExport> {
    try {
        const db = await getDB()
        const missing = () => createError("TRANSFER_ITEM_MISSING", i18n.t("errors.transfer.itemMissing"))
        if (items.length === 0) throw missing()

        // The living subtree (ids) of every selected folder, to leave out what another selected folder already brings
        const subtreeOf = new Map<number, Set<number>>()
        for (const item of items) {
            if (item.type !== "folder" || subtreeOf.has(item.id)) continue
            const rows = await db.select<{ id: number }[]>(
                `WITH RECURSIVE subtree(id) AS (
                    SELECT id FROM folder WHERE id = ? AND deleted_at IS NULL
                    UNION ALL
                    SELECT f.id FROM folder f INNER JOIN subtree s ON f.folderID = s.id WHERE f.deleted_at IS NULL
                 )
                 SELECT id FROM subtree`, [item.id])
            if (rows.length === 0) throw missing()
            subtreeOf.set(item.id, new Set(rows.map(row => row.id)))
        }
        const insideOther = (folderId: number) =>
            [...subtreeOf].some(([topId, ids]) => topId !== folderId && ids.has(folderId))
        const topFolderIds = [...new Set(items.filter(item => item.type === "folder").map(item => item.id))].filter(id => !insideOther(id))
        const folderIds = new Set(topFolderIds.flatMap(id => [...subtreeOf.get(id)!]))

        const exportNotes: ExportNote[] = []
        const exportFolders: ExportFolder[] = []
        let root: { name: string, color: string | null } | null = null
        const topFolders = new Set(topFolderIds)

        const folderRows = folderIds.size === 0 ? [] : await db.select<(Folder & { color: string | null })[]>(
            `SELECT * FROM folder WHERE id IN (${[...folderIds].map(() => "?").join(", ")}) ORDER BY position, id`, [...folderIds])
        const folderById = new Map(folderRows.map(folder => [folder.id, folder]))
        const exported = new Set<number>()
        // Folders in the order of the selection, each followed by its subtree
        for (const item of items) {
            if (item.type === "folder") {
                if (!topFolders.has(item.id) || exported.has(item.id)) continue
                root ??= { name: folderById.get(item.id)!.name, color: folderById.get(item.id)!.color ?? null }
                for (const folder of folderRows.filter(row => subtreeOf.get(item.id)!.has(row.id))) {
                    exported.add(folder.id)
                    exportFolders.push({
                        ref: `f${folder.id}`,
                        parentRef: folder.id === item.id || folder.folderID === null || !subtreeOf.get(item.id)!.has(folder.folderID) ? null : `f${folder.folderID}`,
                        name: folder.name,
                        color: folder.color ?? null,
                        ...(folder.archived_at ? { archived_at: folder.archived_at } : {}),
                        position: folder.position,
                    })
                }
            } else {
                const notes = await db.select<(Note & { color: string | null })[]>(
                    'SELECT * FROM note WHERE id = ? AND deleted_at IS NULL', [item.id])
                if (notes.length === 0) throw missing()
                // Inside a selected folder: exported with it
                if (notes[0].folderID !== null && folderIds.has(notes[0].folderID)) continue
                if (exportNotes.some(note => note.ref === `n${item.id}`)) continue
                root ??= { name: notes[0].name, color: notes[0].color ?? null }
                exportNotes.push(await buildNoteExport(db, notes[0], null))
            }
        }
        if (!root) throw missing()
        if (folderIds.size > 0) {
            const inFolders = await db.select<(Note & { color: string | null })[]>(
                `SELECT * FROM note WHERE deleted_at IS NULL AND folderID IN (${[...folderIds].map(() => "?").join(", ")}) ORDER BY position, id`,
                [...folderIds])
            for (const note of inFolders) exportNotes.push(await buildNoteExport(db, note, `f${note.folderID}`))
        }

        const single = exportFolders.filter(folder => folder.parentRef === null).length + exportNotes.filter(note => note.folderRef === null).length === 1
        return {
            format: WORKSPACE_EXPORT_FORMAT,
            version: WORKSPACE_EXPORT_VERSION,
            scope: "items",
            exportedAt: new Date().toISOString(),
            workspace: { name: name ?? root.name, color: single ? root.color : null },
            folders: exportFolders,
            notes: exportNotes,
            templates: [],
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

function tooMany(): never {
    throw createError("TRANSFER_TOO_MANY_ITEMS", i18n.t("errors.transfer.tooManyItems", { max: MAX_IMPORT_ITEMS.toLocaleString(i18n.language) }))
}

/** Counts the items of a file against MAX_IMPORT_ITEMS (the walk stops as soon as the limit is passed). */
type Counter = { count: number }
function bump(counter: Counter, amount = 1) {
    counter.count += amount
    if (counter.count > MAX_IMPORT_ITEMS) tooMany()
}

function checkTask(task: unknown, counter: Counter, depth = 0) {
    if (!isObject(task) || depth > 100) malformed()
    bump(counter)
    if (!isString(task.text) || !isNumber(task.position) || !Array.isArray(task.subtasks)) malformed()
    if (!isNullableString(task.description) || !isNullableString(task.color) || !isNullableString(task.archived_at)) malformed()
    for (const subtask of task.subtasks as unknown[]) checkTask(subtask, counter, depth + 1)
}

/** Checks a note content so that the insertion never crashes on a malformed file. */
function checkContent(content: unknown, counter: Counter): NoteTemplateContent {
    if (!isObject(content) || !Array.isArray(content.groups)) malformed()
    for (const group of content.groups as unknown[]) {
        bump(counter)
        if (!isObject(group) || !isNumber(group.position) || !Array.isArray(group.sections) || !isNullableString(group.name)
            || !isNullableString(group.color) || !isNullableString(group.archived_at)) malformed()
        for (const section of group.sections as unknown[]) {
            bump(counter)
            if (!isObject(section) || !isString(section.title) || !isNumber(section.position) || !Array.isArray(section.tasks)
                || !isNullableString(section.color) || !isNullableString(section.archived_at)) malformed()
            for (const task of section.tasks as unknown[]) checkTask(task, counter)
        }
    }
    return content as unknown as NoteTemplateContent
}

/** An empty color is not a valid color (CHECK LENGTH(color) > 0): it means "no color". */
const cleanColor = (color: string | null | undefined): string | null => color ? color : null

/** Returns "name", or "name (2)", "name (3)"... the first one not in `used`; the result is added to `used`. */
function uniqueSibling(name: string, used: Set<string>): string {
    let candidate = name
    for (let counter = 2; used.has(candidate); counter++) candidate = `${name} (${counter})`
    used.add(candidate)
    return candidate
}

const untitled = (value: string) => value.trim() || i18n.t("errors.transfer.untitled")

type ContentTask = NoteTemplateContent["groups"][number]["sections"][number]["tasks"][number]

function normalizeTask(task: ContentTask) {
    task.text = untitled(task.text)
    task.color = cleanColor(task.color)
    for (const subtask of task.subtasks) normalizeTask(subtask)
}

/**
 * Fixes (in place) what the database would reject: blank task texts and section titles get a placeholder,
 * empty colors become null and section titles clashing in the same group get a numeric suffix.
 */
function normalizeContent(content: NoteTemplateContent) {
    for (const group of content.groups) {
        group.color = cleanColor(group.color)
        const titles = new Set<string>()
        for (const section of group.sections) {
            section.title = uniqueSibling(untitled(section.title), titles)
            section.color = cleanColor(section.color)
            for (const task of section.tasks) normalizeTask(task)
        }
    }
}

/** Renames (in place) the items of the same parent that share a name, keeping the file order. */
function dedupeNames<T extends { name: string }>(items: T[], parentOf: (item: T) => string | null) {
    const used = new Map<string | null, Set<string>>()
    for (const item of items) {
        const parent = parentOf(item)
        let names = used.get(parent)
        if (!names) used.set(parent, names = new Set())
        item.name = uniqueSibling(item.name.trim(), names)
    }
}

/**
 * Validates the parsed content of an export file.
 * @param data The parsed JSON.
 * @returns The same data, typed.
 * @throws A "TRANSFER_INVALID_FILE" error (Italian message) for a wrong format or malformed structure,
 * "TRANSFER_UNSUPPORTED_VERSION" for an unsupported version, "TRANSFER_TOO_MANY_ITEMS" above MAX_IMPORT_ITEMS.
 * The data is also normalized in place: blank task texts / section titles get a placeholder, empty colors become null,
 * and sibling folders, notes and sections with the same name get a numeric suffix.
 * @category Database Queries
 */
export function validateWorkspaceExport(data: unknown): WorkspaceExport {
    if (!isObject(data) || data.format !== WORKSPACE_EXPORT_FORMAT)
        throw createError("TRANSFER_INVALID_FILE", INVALID_FILE_MESSAGE())
    if (data.version !== WORKSPACE_EXPORT_VERSION)
        throw createError("TRANSFER_UNSUPPORTED_VERSION", i18n.t("errors.transfer.unsupportedVersion"))

    const { workspace, folders, notes, templates, scope } = data
    if (scope !== undefined && scope !== "workspace" && scope !== "items") malformed()
    if (!isObject(workspace) || !isNonEmpty(workspace.name) || !isNullableString(workspace.color)) malformed()
    if (!Array.isArray(folders) || !Array.isArray(notes) || !Array.isArray(templates)) malformed()
    const counter: Counter = { count: 0 }
    bump(counter, folders.length + notes.length + templates.length)

    const folderRefs = new Set<string>()
    for (const folder of folders as unknown[]) {
        if (!isObject(folder) || !isNonEmpty(folder.ref) || !isNonEmpty(folder.name) || !isNumber(folder.position)
            || !isNullableString(folder.color) || !isNullableString(folder.archived_at) || !(folder.parentRef === null || isString(folder.parentRef))) malformed()
        if (folderRefs.has(folder.ref)) malformed()
        folderRefs.add(folder.ref)
    }
    for (const folder of folders as ExportFolder[])
        if (folder.parentRef !== null && !folderRefs.has(folder.parentRef)) malformed()

    const noteRefs = new Set<string>()
    for (const note of notes as unknown[]) {
        if (!isObject(note) || !isNonEmpty(note.ref) || !isNonEmpty(note.name) || !isNumber(note.position)
            || !isNullableString(note.color) || !isNullableString(note.archived_at) || !Array.isArray(note.audio)
            || !(note.folderRef === null || (isString(note.folderRef) && folderRefs.has(note.folderRef)))) malformed()
        if (noteRefs.has(note.ref)) malformed()
        noteRefs.add(note.ref)
        const content = checkContent(note.content, counter)
        if (note.automations !== undefined) {
            if (!Array.isArray(note.automations)) malformed()
            bump(counter, note.automations.length)
            for (const automation of note.automations as unknown[])
                if (!isPortableAutomation(automation, content)) malformed()
        }
        for (const audio of note.audio as unknown[]) {
            if (!isObject(audio) || !isNumber(audio.groupIndex) || !isNonEmpty(audio.name) || !isNonEmpty(audio.path)
                || !isNumber(audio.position) || audio.groupIndex < 0 || audio.groupIndex >= content.groups.length) malformed()
        }
    }
    for (const template of templates as unknown[]) {
        if (!isObject(template) || !isNonEmpty(template.name) || !isNullableString(template.color)) malformed()
        checkContent(template.content, counter)
    }

    if (scope === "items") {
        // A part of a workspace: no templates and at least one item at the top
        const hasRoot = (folders as ExportFolder[]).some(folder => folder.parentRef === null)
            || (notes as ExportNote[]).some(note => note.folderRef === null)
        if (templates.length > 0 || !hasRoot) malformed()
    }

    const result = data as unknown as WorkspaceExport
    result.workspace.color = cleanColor(result.workspace.color)
    for (const folder of result.folders) folder.color = cleanColor(folder.color)
    for (const note of result.notes) {
        note.color = cleanColor(note.color)
        normalizeContent(note.content)
    }
    for (const template of result.templates) {
        template.color = cleanColor(template.color)
        template.name = template.name.trim()
        normalizeContent(template.content)
    }
    dedupeNames(result.folders, folder => folder.parentRef)
    dedupeNames(result.notes, note => note.folderRef)
    return result
}

/**
 * Default check for the audio files of an import: the Rust `audio_file_exists` command, which (unlike plugin-fs
 * `exists`) is not scoped to the EasyTask folder. An error of the command says nothing about the file, so it is
 * treated as present (the row is kept, the app already handles a missing audio file at playback). Only a definite
 * `false` skips the file.
 * @param path Absolute path of the audio file.
 * @category Database Queries
 */
async function defaultAudioExists(path: string): Promise<boolean> {
    try {
        return await invoke<boolean>("audio_file_exists", { path })
    } catch {
        return true
    }
}

const hasAudioExtension = (path: string) => {
    const dot = path.lastIndexOf(".")
    return dot >= 0 && (AUDIO_EXTENSIONS as readonly string[]).includes(path.slice(dot + 1).toLowerCase())
}

/** Returns the first free workspace name: "name", "name (imported)", "name (imported 2)"... (the word comes from the current language). */
async function uniqueWorkspaceName(db: Database, name: string): Promise<string> {
    // Trashed workspaces are included: they still hold the UNIQUE constraint on the name
    const rows = await db.select<{ name: string }[]>('SELECT name FROM workspace')
    const used = new Set(rows.map(row => row.name.toLowerCase()))
    if (!used.has(name.toLowerCase())) return name
    const word = i18n.t("errors.transfer.suffix")
    for (let counter = 1; ; counter++) {
        const candidate = counter === 1 ? `${name} (${word})` : `${name} (${word} ${counter})`
        if (!used.has(candidate.toLowerCase())) return candidate
    }
}

type PendingFolder = { folder: ExportFolder, parentRef: TxRef | number | null }

type InsertedItems = { skippedAudio: number, folderRefs: Map<string, TxRef>, noteRefs: TxRef[] }

/**
 * Adds to `tx` the folders, notes (with their content) and audio files of an export. The top items of the file go under
 * `rootParent` (a folder id or reference, null = workspace root). Audio files that are missing, have no audio extension or
 * clash on the name inside the group are skipped and counted.
 */
async function insertItems(
    tx: Transaction, data: WorkspaceExport, workspaceRef: TxRef | number, rootParent: TxRef | number | null,
    audioExists: (path: string) => Promise<boolean>,
): Promise<InsertedItems> {
    let skippedAudio = 0
    // Folders level by level: children reference the ids of their parents
    const folderRefs = new Map<string, TxRef>()
    const childrenOf = new Map<string | null, ExportFolder[]>()
    for (const folder of data.folders) {
        const siblings = childrenOf.get(folder.parentRef)
        if (siblings) siblings.push(folder)
        else childrenOf.set(folder.parentRef, [folder])
    }
    let level: PendingFolder[] = (childrenOf.get(null) ?? []).map(folder => ({ folder, parentRef: rootParent }))
    let imported = 0
    while (level.length > 0) {
        const refs = tx.insertRows("folder", ["workspaceID", "folderID", "name", "color", "archived_at", "position"],
            level.map(({ folder, parentRef }) => [workspaceRef, parentRef, folder.name.trim(), folder.color ?? null, folder.archived_at || null, folder.position]))
        level.forEach(({ folder }, i) => folderRefs.set(folder.ref, refs[i]))
        imported += level.length
        level = level.flatMap(({ folder }, i) =>
            (childrenOf.get(folder.ref) ?? []).map(child => ({ folder: child, parentRef: refs[i] })))
    }
    // Folders left out are part of a parent cycle
    if (imported !== data.folders.length) throw createError("TRANSFER_INVALID_TREE", i18n.t("errors.transfer.invalidFolderTree"))

    let noteRefs: TxRef[] = []
    if (data.notes.length > 0) {
        noteRefs = tx.insertRows("note", ["workspaceID", "folderID", "name", "color", "archived_at", "position"],
            data.notes.map(note => [
                workspaceRef, note.folderRef === null ? rootParent : folderRefs.get(note.folderRef) ?? null,
                note.name.trim(), note.color ?? null, note.archived_at || null, note.position,
            ]))

        for (const [i, note] of data.notes.entries()) {
            const { groups: groupRefs, sections: sectionRefs } = addNoteContent(tx, noteRefs[i], note.content)
            if (note.automations?.length) addNoteAutomations(tx, noteRefs[i], note.automations, note.content, sectionRefs, groupRefs)
            const rows: unknown[][] = []
            const taken = new Set<string>()
            for (const file of note.audio) {
                let keep = hasAudioExtension(file.path)
                if (keep) {
                    try {
                        keep = await audioExists(file.path)
                    } catch {
                        keep = false
                    }
                }
                // UNIQUE(name, section_groupID): a duplicated name in the file is skipped instead of failing the import
                const key = `${file.groupIndex}^@${file.name.toLowerCase()}`
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
    return { skippedAudio, folderRefs, noteRefs }
}


/**
 * Imports an export as a new workspace. The name is made unique ("name (importato)", "name (importato 2)"...).
 * The workspace and everything in it are written in ONE database transaction: on any failure nothing is created.
 * @param data A validated export (see validateWorkspaceExport).
 * @param options `audioExists` decides whether an audio file is kept (files for which it returns false or throws are skipped).
 * Audio files without an allowed extension (AUDIO_EXTENSIONS) are always skipped.
 * @returns The ID of the new workspace and the number of skipped audio files.
 * @category Database Queries
 */
export async function importDBWorkspace(
    data: WorkspaceExport,
    options: { audioExists?: (path: string) => Promise<boolean> } = {},
): Promise<{ workspaceId: number, skippedAudio: number }> {
    if (data.scope === "items") throw createError("TRANSFER_ITEMS_FILE", i18n.t("errors.transfer.itemsFile"))
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

    try {
        const workspaceRef = tx.idOf(workspace)
        const { skippedAudio } = await insertItems(tx, data, workspaceRef, null, audioExists)

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

/** The notes and folders created by an items import, with their name after the renaming of the clashes. */
export type ImportedItems = {
    skippedAudio: number
    items: { type: "folder" | "note", id: number, name: string }[]
}

/**
 * Imports an items export (a note, or a folder with its subtree) into an existing workspace, under a folder or at its root.
 * The top items are appended after the existing siblings, renamed on a name clash ("name (2)", "name (3)"...) and never
 * archived (the items inside keep their archive date); everything
 * is written in ONE database transaction: on any failure nothing is created.
 * @param data A validated export with scope "items" (see validateWorkspaceExport).
 * @param workspaceId The workspace to import into.
 * @param parentFolderId The destination folder, null for the workspace root.
 * @param options `audioExists` decides whether an audio file is kept (see importDBWorkspace).
 * @returns The skipped audio files and the top items created (with their new ids), for the caller to refresh and undo.
 * @throws "TRANSFER_WORKSPACE_FILE" for a whole-workspace file, "TRANSFER_PARENT_MISSING" when the destination folder is gone,
 * "TRANSFER_IMPORT_FAILED" otherwise.
 * @category Database Queries
 */
export async function importDBItems(
    data: WorkspaceExport,
    workspaceId: number,
    parentFolderId: number | null,
    options: { audioExists?: (path: string) => Promise<boolean> } = {},
): Promise<ImportedItems> {
    if (data.scope !== "items") throw createError("TRANSFER_WORKSPACE_FILE", i18n.t("errors.transfer.workspaceFile"))
    const audioExists = options.audioExists ?? defaultAudioExists
    try {
        const db = await getDB()
        if (parentFolderId !== null) {
            const parents = await db.select<{ id: number }[]>(
                'SELECT id FROM folder WHERE id = ? AND workspaceID = ? AND deleted_at IS NULL AND archived_at IS NULL', [parentFolderId, workspaceId])
            if (parents.length === 0) throw createError("TRANSFER_PARENT_MISSING", i18n.t("errors.transfer.parentMissing"))
        }

        // Top items: after the existing siblings, with a free name among them
        const parentKey = parentFolderId ?? 0
        const siblings = async (table: "folder" | "note") => db.select<{ name: string, position: number }[]>(
            `SELECT name, position FROM ${table} WHERE workspaceID = ? AND IFNULL(folderID, 0) = ? AND deleted_at IS NULL`,
            [workspaceId, parentKey])
        const topFolders = data.folders.filter(folder => folder.parentRef === null)
        const topNotes = data.notes.filter(note => note.folderRef === null)
        for (const [items, table] of [[topFolders, "folder"], [topNotes, "note"]] as const) {
            if (items.length === 0) continue
            const existing = await siblings(table)
            const used = new Set(existing.map(row => row.name))
            let position = existing.reduce((max, row) => Math.max(max, row.position + 1), 0)
            for (const item of items) {
                item.name = uniqueSibling(item.name.trim(), used)
                item.position = position++
                // What the user imports on purpose shows up: only the items inside keep their archive date
                item.archived_at = null
            }
        }

        const tx = new Transaction()
        const { skippedAudio, folderRefs, noteRefs } = await insertItems(tx, data, workspaceId, parentFolderId, audioExists)
        const results = await tx.run()
        const idOf = (ref: TxRef) => results[ref.$ref].lastInsertId - ref.offset
        return {
            skippedAudio,
            items: [
                ...topFolders.map(folder => ({ type: "folder" as const, id: idOf(folderRefs.get(folder.ref)!), name: folder.name })),
                ...topNotes.map(note => ({ type: "note" as const, id: idOf(noteRefs[data.notes.indexOf(note)]), name: note.name })),
            ],
        }
    } catch (error: unknown) {
        if (isAppError(error)) throw error
        throw createError("TRANSFER_IMPORT_FAILED", i18n.t("errors.transfer.import", { message: getErrorMessage(error) }))
    }
}
