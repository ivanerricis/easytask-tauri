import { handleDBError } from "@/types/error";
import { getDB } from "../dbManager";
import { Transaction } from "../transaction";

/**
 * Creates a new task in the database.
 * @param sectionId The ID of the section to which the task belongs.
 * @param text The text of the task.
 * @param color The color of the task (optional).
 * @category Database Queries
 */
export async function createDBWorkspaceFolder(workspaceId: number, name: string, color?: string | null) {
    try {
        const db = await getDB()
        await db.execute(
            `INSERT INTO folder (workspaceID, name, color, position)
             SELECT ?, ?, ?, COALESCE(MAX(position) + 1, 0) FROM folder
             WHERE workspaceID = ? AND folderID IS NULL AND deleted_at IS NULL`,
            [workspaceId, name, color ?? null, workspaceId])
    } catch (error: unknown) {
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
 * @category Database Queries
 */
export async function createDBSubFolder(workspaceID: number, folderId: number, name: string) {
    try {
        const db = await getDB()
        await db.execute(
            `INSERT INTO folder (workspaceID, folderID, name, position)
             SELECT ?, ?, ?, COALESCE(MAX(position) + 1, 0) FROM folder
             WHERE folderID = ? AND deleted_at IS NULL`,
            [workspaceID, folderId, name, folderId])
    } catch (error: unknown) {
        handleDBError(error, "FOLDER", {
            UNIQUE: "A folder with this name already exists.",
            CHECK: "The folder name cannot be empty.",
        })
    }
}

/**
 * Updates the color of a folder and all its subfolders.
 * @param folderId The ID of the folder to update.
 * @param color The new color of the folder (optional).
 * @category Database Queries
 */
export async function updateDBFolderColorContent(folderId: number, color?: string | null) {
    try {
        const db = await getDB()
        const folders = await db.select<{ id: number }[]>(
            `
            WITH RECURSIVE folder_tree AS (
                SELECT id FROM folder WHERE id = ?
                UNION
                SELECT f.id FROM folder f
                INNER JOIN folder_tree ft ON f.folderID = ft.id
            )
            SELECT id FROM folder_tree
            `,
            [folderId]
        )

        const folderIds = folders.map(f => f.id)
        if (folderIds.length === 0) return

        const placeholders = folderIds.map(() => '?').join(',')

        const tx = new Transaction()
        tx.add(`UPDATE folder SET color = ? WHERE id IN (${placeholders})`, [color, ...folderIds])
        tx.add(`UPDATE note SET color = ? WHERE folderID IN (${placeholders})`, [color, ...folderIds])
        await tx.run()

    } catch (error: unknown) {
        console.error(error)
        handleDBError(error, "FOLDER", {
            UNIQUE: "A folder with this name already exists.",
            CHECK: "The folder name cannot be empty.",
        })
    }
}