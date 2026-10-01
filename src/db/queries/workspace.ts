import i18n from "@/i18n"
import type { Folder, Note, Workspace } from "@/types/types";
import { getDB } from "../dbManager"
import { createError, handleDBError } from "@/types/error";
import { getErrorMessage } from "@/lib/utils";

/**
 * Retrieves the workspace data for a given workspace ID.
 * @param workspaceID The ID of the workspace to retrieve data for.
 * Folders and notes are ordered by position; soft deleted items are excluded.
 * @returns The workspace data, including folders and notes.
 * @throws A createError('WORKSPACE_DATA_LOAD_FAILED') error when the query fails.
 * @category Database Queries
 */
export async function getDBWorkspaceData(workspaceID: number) {
    try {
        const db = await getDB()
        const folders = await db.select<Folder[]>(
            'SELECT * FROM folder WHERE workspaceID=? AND deleted_at IS NULL ORDER BY position, name COLLATE NOCASE ASC',
            [workspaceID])
        const notes = await db.select<Note[]>(
            'SELECT * FROM note WHERE workspaceID=? AND deleted_at IS NULL ORDER BY position, name COLLATE NOCASE ASC',
            [workspaceID])

        return { folders, notes }
    } catch (error: unknown) {
        throw createError('WORKSPACE_DATA_LOAD_FAILED', i18n.t("errors.workspace.load", { message: getErrorMessage(error) }))
    }
}

/**
 * Retrieves all workspaces from the database.
 * @returns A list of all workspaces ordered by edit date and time.
 * @category Database Queries
 */
export async function getDBWorkspaces() {
    try {
        const db = await getDB()
        return await db.select<Workspace[]>('SELECT * FROM workspace WHERE deleted_at IS NULL ORDER BY edit_date DESC, edit_time DESC')
    } catch (error: unknown) {
        handleDBError(error, "ERROR_ON_GET_WORKSPACE", {
            UNIQUE: i18n.t("errors.workspace.unique"),
            CHECK: i18n.t("errors.workspace.check"),
        })
    }
}

/**
 * Creates a new workspace in the database.
 * @param name The name of the workspace.
 * @param color The color of the workspace (optional).
 * @category Database Queries
 */
export async function createDBWorkspace(name: string, color?: string | null) {
    try {
        const db = await getDB();
        await db.execute('INSERT INTO workspace (name, color) VALUES (?, ?)', [name, color ?? null])
    } catch (error: unknown) {
        handleDBError(error, "WORKSPACE", {
            UNIQUE: i18n.t("errors.workspace.unique"),
            CHECK: i18n.t("errors.workspace.check"),
        })
    }
}