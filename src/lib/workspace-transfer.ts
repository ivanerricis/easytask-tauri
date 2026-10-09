import i18n from "@/i18n"
import { open, save } from "@tauri-apps/plugin-dialog"
import { readTextFile, stat, writeTextFile } from "@tauri-apps/plugin-fs"
import {
    buildDBItemExport, buildDBItemsExport, buildDBWorkspaceExport, importDBItems, importDBWorkspace, suggestDBItemNames, suggestDBWorkspaceImportName,
    validateWorkspaceExport, type ImportedItems,
} from "@/db/queries/transfer"
import { createError } from "@/types/error"
import { MAX_IMPORT_FILE_BYTES, type WorkspaceExport } from "@/types/transfer"

const FILTERS = [{ name: "EasyTask", extensions: ["json"] }]

/** Something an import creates at the top (the workspace, or the top notes and folders) and the name proposed for it. */
export type ImportName = { type: "workspace" | "folder" | "note", name: string }

/**
 * Lets the user review the names before importing: `submit` imports with the chosen names (it may fail, e.g. on a name
 * clash, and be tried again with other names); resolves with its result, or null when the user cancels.
 * @category Utilities
 */
export type ChooseImportNames = <T>(proposed: ImportName[], submit: (names: string[]) => Promise<T>) => Promise<T | null>

/** Imports with the proposed names, without asking. */
const acceptProposed: ChooseImportNames = (proposed, submit) => submit(proposed.map(item => item.name))

// Characters not allowed in a Windows file name
const sanitizeFileName = (name: string) => name.replace(/[<>:"/\\|?*]/g, "_").trim() || "workspace"

/**
 * Asks where to save and writes the export of a workspace (`<name>.easytask.json`, pretty printed).
 * @param workspace The workspace to export.
 * @returns false when the user cancelled the dialog.
 * @category Utilities
 */
export async function exportWorkspaceToFile(workspace: { id: number, name: string }): Promise<boolean> {
    const path = await save({ filters: FILTERS, defaultPath: `${sanitizeFileName(workspace.name)}.easytask.json` })
    if (!path) return false
    const data = await buildDBWorkspaceExport(workspace.id)
    await writeTextFile(path, JSON.stringify(data, null, 2))
    return true
}

/**
 * Asks where to save and writes the export of a single note or folder (`<name>.easytask.json`, pretty printed).
 * @param itemType "note" or "folder".
 * @param item The note or folder to export (its name is the default file name).
 * @returns false when the user cancelled the dialog.
 * @category Utilities
 */
export async function exportItemToFile(itemType: "note" | "folder", item: { id: number, name: string }): Promise<boolean> {
    const path = await save({ filters: FILTERS, defaultPath: `${sanitizeFileName(item.name)}.easytask.json` })
    if (!path) return false
    const data = await buildDBItemExport(itemType, item.id)
    await writeTextFile(path, JSON.stringify(data, null, 2))
    return true
}

/**
 * Asks where to save and writes the export of several notes and folders in ONE file (`<name>.easytask.json`), in the format of
 * the single item export: importing it creates every item.
 * @param items The notes and folders to export (the caller has already dropped the ones inside another selected folder).
 * @param name Default file name, also stored in the file.
 * @returns false when the user cancelled the dialog.
 * @category Utilities
 */
export async function exportItemsToFile(items: { type: "note" | "folder", id: number }[], name: string): Promise<boolean> {
    const path = await save({ filters: FILTERS, defaultPath: `${sanitizeFileName(name)}.easytask.json` })
    if (!path) return false
    const data = await buildDBItemsExport(items, name)
    await writeTextFile(path, JSON.stringify(data, null, 2))
    return true
}

/** Asks for an export file and returns its validated content (null when the user cancelled the dialog). */
async function pickExportFile(): Promise<WorkspaceExport | null> {
    const path = await open({ filters: FILTERS, multiple: false, directory: false })
    if (!path) return null

    // A failing stat is ignored: the read below reports the real problem
    const size = await stat(path).then(info => info.size, () => 0)
    if (size > MAX_IMPORT_FILE_BYTES)
        throw createError("TRANSFER_FILE_TOO_LARGE", i18n.t("errors.transfer.fileTooLarge", { max: MAX_IMPORT_FILE_BYTES / (1024 * 1024) }))

    let parsed: unknown
    try {
        parsed = JSON.parse(await readTextFile(path))
    } catch {
        throw createError("TRANSFER_INVALID_FILE", i18n.t("errors.transfer.invalidJson"))
    }
    return validateWorkspaceExport(parsed)
}

/**
 * Asks for an export file and imports it as a new workspace, with the name the user confirms (a free name is proposed).
 * @param choose Shows the proposed name and imports with the chosen one (default: the proposed name, without asking).
 * @returns null when the user cancelled a dialog, otherwise the new workspace ID and the number of skipped audio files.
 * @throws "TRANSFER_ITEMS_FILE" when the file holds a note or folder instead of a workspace.
 * @category Utilities
 */
export async function importWorkspaceFromFile(choose: ChooseImportNames = acceptProposed): Promise<{ workspaceId: number, skippedAudio: number } | null> {
    const data = await pickExportFile()
    if (!data) return null
    if (data.scope === "items") throw createError("TRANSFER_ITEMS_FILE", i18n.t("errors.transfer.itemsFile"))
    const name = await suggestDBWorkspaceImportName(data)
    return choose([{ type: "workspace", name }], names => importDBWorkspace(data, { name: names[0] }))
}

/**
 * Asks for an export file with notes and folders and imports it into a workspace, with the names the user confirms for the
 * top items (free names among the destination are proposed).
 * @param workspaceId The workspace to import into.
 * @param parentFolderId The destination folder, null for the workspace root.
 * @param choose Shows the proposed names and imports with the chosen ones (default: the proposed names, without asking).
 * @returns null when the user cancelled a dialog, otherwise the top items created and the number of skipped audio files.
 * @throws "TRANSFER_WORKSPACE_FILE" when the file holds a whole workspace.
 * @category Utilities
 */
export async function importItemsFromFile(workspaceId: number, parentFolderId: number | null, choose: ChooseImportNames = acceptProposed): Promise<ImportedItems | null> {
    const data = await pickExportFile()
    if (!data) return null
    if (data.scope !== "items") throw createError("TRANSFER_WORKSPACE_FILE", i18n.t("errors.transfer.workspaceFile"))
    const proposed = await suggestDBItemNames(data, workspaceId, parentFolderId)
    return choose(proposed, names => importDBItems(data, workspaceId, parentFolderId, { names }))
}
