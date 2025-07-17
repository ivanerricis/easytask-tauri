import { createError } from "@/types/error";
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
        const errorMessage = String(error)
        if (errorMessage.includes('UNIQUE')) {
            throw new Error('FOLDER_EXISTS')
        }
        else if (errorMessage.includes('CHECK')) {
            throw new Error('EMPTY_NAME')
        }
        else {
            throw new Error(error)
        }
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
        const errorMessage = String(error)
        if (errorMessage.includes('UNIQUE')) {
            throw createError("FOLDER_EXISTS", "Esiste già una cartella con questo nome")
        }
        else if (errorMessage.includes('CHECK')) {
            throw createError("EMPTY_NAME", "Il nome della cartella non può essere vuoto")
        }
        else {
            throw createError("UNKNOWN_ERROR", "Si è verificato un errore sconosciuto")
        }
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
        const errorMessage = String(error)
        if (errorMessage.includes('UNIQUE')) {
            throw new Error('FOLDER_EXISTS')
        }
        else if (errorMessage.includes('CHECK')) {
            throw new Error('EMPTY_NAME')
        }
        else {
            throw new Error(error)
        }
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
        throw new Error(error)
    }
}