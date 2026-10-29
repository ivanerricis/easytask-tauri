import { withDBErrors, FOLDER_MESSAGES } from "./errors";
import { getDB } from "../dbManager";
import { Transaction } from "../transaction";
import { nextPositionSql } from "./sql";

/**
 * Creates a new folder at the root of a workspace, appended after its siblings.
 * @param workspaceId The ID of the workspace to which the folder belongs.
 * @param name The name of the folder.
 * @param color The color of the folder (optional).
 * @returns The ID of the new folder.
 * @category Database Queries
 */
export async function createDBWorkspaceFolder(workspaceId: number, name: string, color?: string | null) {
    return withDBErrors("FOLDER", FOLDER_MESSAGES, async () => {
        const db = await getDB()
        const result = await db.execute(
            `INSERT INTO folder (workspaceID, name, color, position)
             SELECT ?, ?, ?, ${nextPositionSql("folder", "workspaceID = ? AND folderID IS NULL AND deleted_at IS NULL")}`,
            [workspaceId, name, color ?? null, workspaceId])
        return result.lastInsertId as number
    })
}

/**
 * Creates a new subfolder inside a folder, appended after its siblings.
 * @param workspaceID The ID of the workspace of the folder.
 * @param folderId The ID of the parent folder.
 * @param name The name of the new folder.
 * @returns The ID of the new folder.
 * @category Database Queries
 */
export async function createDBSubFolder(workspaceID: number, folderId: number, name: string) {
    return withDBErrors("FOLDER", FOLDER_MESSAGES, async () => {
        const db = await getDB()
        const result = await db.execute(
            `INSERT INTO folder (workspaceID, folderID, name, position)
             SELECT ?, ?, ?, ${nextPositionSql("folder", "folderID = ? AND deleted_at IS NULL")}`,
            [workspaceID, folderId, name, folderId])
        return result.lastInsertId as number
    })
}

/**
 * Updates the color of a folder and all its subfolders.
 * @param folderId The ID of the folder to update.
 * @param color The new color of the folder (optional).
 * @category Database Queries
 */
export async function updateDBFolderColorContent(folderId: number, color?: string | null) {
    return withDBErrors("FOLDER", FOLDER_MESSAGES, async () => {
        // The subtree is a recursive CTE inside each UPDATE (no list of ids to bind); both run in one transaction
        const subtree = `WITH RECURSIVE folder_tree AS (
                SELECT id FROM folder WHERE id = ?
                UNION
                SELECT f.id FROM folder f
                INNER JOIN folder_tree ft ON f.folderID = ft.id
            )`
        const tx = new Transaction()
        tx.add(`${subtree} UPDATE folder SET color = ? WHERE id IN (SELECT id FROM folder_tree)`, [folderId, color ?? null])
        tx.add(`${subtree} UPDATE note SET color = ? WHERE folderID IN (SELECT id FROM folder_tree)`, [folderId, color ?? null])
        await tx.run()
    })
}