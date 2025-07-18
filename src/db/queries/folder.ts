import { createError, handleDBError } from "@/types/error";
import { getDB } from "../dbManager";

/**
 * Creates a new task in the database.
 * @param sectionId The ID of the section to which the task belongs.
 * @param text The text of the task.
 * @param color The color of the task (optional).
 * @category Database
 */
export async function createDBWorkspaceFolder(workspaceId: number, name: string, color?: string | null) {
    const db = await getDB()

    try {
        await db.execute('INSERT INTO folder (workspace_id, name, color) VALUES (?, ?, ?)', [workspaceId, name, color ?? null])
    } catch (error: any) {
        handleDBError(error, "FOLDER", {
            UNIQUE: "A folder with this name already exists.",
            CHECK: "The folder name cannot be empty.",
        })
    }
}

/**
 * Edits an existing folder in the database.
 * @param folderId The ID of the folder to edit.
 * @param name The new name of the folder.
 * @param color The new color of the folder (optional).
 * @category Database
 */
export async function createDBSubFolder(folderId: number, name: string, color?: string | null) {
    const db = await getDB()

    try {
        await db.execute('INSERT INTO folder (folder_id, name, color) VALUES (?, ?, ?)', [folderId, name, color ?? null])
    } catch (error: any) {
        handleDBError(error, "FOLDER", {
            UNIQUE: "A folder with this name already exists.",
            CHECK: "The folder name cannot be empty.",
        })
    }
}


export async function editDBFolder(folderId: number, name: string, color: string) {
    const db = await getDB()

    try {
        if (color)
            await db.execute('UPDATE folder SET name=?, color=? WHERE id=?', [name, color, folderId])
        else
            await db.execute('UPDATE folder SET name=? WHERE id=?', [name, folderId])
    } catch (error: any) {
        handleDBError(error, "FOLDER", {
            UNIQUE: "A folder with this name already exists.",
            CHECK: "The folder name cannot be empty.",
        })
    }
}

/**
 * Deletes a folder from the database.
 * @param id The ID of the folder to delete.
 * @category Database
 */
export async function deleteDBFolder(id: number) {
    const db = await getDB()

    try {
        await db.execute('DELETE FROM folder WHERE id=?', [id])
    } catch (error: any) {
        throw createError('FOLDER_DELETE_ERROR', 'An error occurred while deleting the folder: ' + error.message)
    }
}