import type { Folder, Note, Workspace } from "@/types/types";
import { getDB } from "../dbManager"
import { handleDBError } from "@/types/error";

/**
 * Retrieves the workspace data for a given workspace ID.
 * @param workspaceID The ID of the workspace to retrieve data for.
 * @returns The workspace data, including folders and notes.
 * @category Database Queries
 */
export async function getDBWorkspaceData(workspaceID: number) {
    try {
        const db = await getDB()
        const folders = await db.select<Folder[]>('SELECT * FROM folder WHERE workspaceID=? ORDER BY name COLLATE NOCASE ASC',
            [workspaceID])
        const notes = await db.select<Note[]>('SELECT * FROM note WHERE workspaceID=? OR folderID IN (SELECT id FROM folder WHERE workspaceid=?) ORDER BY name COLLATE NOCASE ASC',
            [workspaceID, workspaceID])

        return { folders, notes }
    } catch (error) {
        console.log(error)
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
        return await db.select<Workspace[]>('SELECT * FROM workspace ORDER BY edit_date DESC, edit_time DESC')
    } catch (error: any) {
        handleDBError(error, "ERROR_ON_GET_WORKSPACE", {
            UNIQUE: "A workspace with this name already exists.",
            CHECK: "The workspace name cannot be empty.",
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
    } catch (error: any) {
        handleDBError(error, "WORKSPACE", {
            UNIQUE: "A workspace with this name already exists.",
            CHECK: "The workspace name cannot be empty.",
        })
    }
}