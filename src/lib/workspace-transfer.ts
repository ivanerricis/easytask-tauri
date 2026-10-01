import i18n from "@/i18n"
import { open, save } from "@tauri-apps/plugin-dialog"
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs"
import { buildDBWorkspaceExport, importDBWorkspace, validateWorkspaceExport } from "@/db/queries/transfer"
import { createError } from "@/types/error"

const FILTERS = [{ name: "EasyTask", extensions: ["json"] }]

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
 * Asks for an export file and imports it as a new workspace.
 * @returns null when the user cancelled the dialog, otherwise the new workspace ID and the number of skipped audio files.
 * @category Utilities
 */
export async function importWorkspaceFromFile(): Promise<{ workspaceId: number, skippedAudio: number } | null> {
    const path = await open({ filters: FILTERS, multiple: false, directory: false })
    if (!path) return null

    let parsed: unknown
    try {
        parsed = JSON.parse(await readTextFile(path))
    } catch {
        throw createError("TRANSFER_INVALID_FILE", i18n.t("errors.transfer.invalidJson"))
    }
    return importDBWorkspace(validateWorkspaceExport(parsed))
}
