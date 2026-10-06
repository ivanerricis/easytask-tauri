import type { NoteTemplateContent } from "@/types/template"

/**
 * An audio file of a note group in a workspace export. Only the path is stored, the file itself is not copied.
 * `groupIndex` is the index of the group inside the note `content.groups`.
 * @category Types
 */
export type ExportAudio = {
    groupIndex: number
    name: string
    path: string
    position: number
}

/**
 * A folder in a workspace export. `ref` identifies it inside the file, `parentRef` is null for root folders.
 * @category Types
 */
export type ExportFolder = {
    ref: string
    parentRef: string | null
    name: string
    color: string | null
    position: number
}

/**
 * A note in a workspace export. `folderRef` is null for notes at the workspace root.
 * @category Types
 */
export type ExportNote = {
    ref: string
    folderRef: string | null
    name: string
    color: string | null
    position: number
    content: NoteTemplateContent
    audio: ExportAudio[]
}

/**
 * A note template in a workspace export.
 * @category Types
 */
export type ExportTemplate = {
    name: string
    color: string | null
    content: NoteTemplateContent
}

/**
 * Content of a `<workspace name>.easytask.json` file: the non deleted content of a workspace.
 * @category Types
 */
export type WorkspaceExport = {
    format: "easytask-workspace"
    version: 1
    /**
     * "items": a single note, or a folder with its whole subtree (`workspace` then carries the name and color of that
     * item, `templates` is empty); importable only inside an open workspace. Absent or "workspace": a whole workspace.
     */
    scope?: ExportScope
    exportedAt: string
    workspace: { name: string, color: string | null }
    folders: ExportFolder[]
    notes: ExportNote[]
    templates: ExportTemplate[]
}

/**
 * What an export file contains: a whole workspace or a part of it (one note or one folder).
 * @category Types
 */
export type ExportScope = "workspace" | "items"

export const WORKSPACE_EXPORT_FORMAT = "easytask-workspace"
export const WORKSPACE_EXPORT_VERSION = 1

/**
 * Largest export file accepted by the import, in bytes (checked before reading it).
 * @category Types
 */
export const MAX_IMPORT_FILE_BYTES = 50 * 1024 * 1024

/**
 * Largest number of items (folders, notes, templates, groups, sections and tasks together) accepted by the import.
 * @category Types
 */
export const MAX_IMPORT_ITEMS = 100_000
