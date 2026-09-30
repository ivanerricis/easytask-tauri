import { handleDBError } from "@/types/error";
import { getDB } from "../dbManager";

/**
 * Creates a new section in a specific group, appended after its siblings.
 * @param groupId The ID of the group where the section will be created.
 * @param title The title of the section.
 * @param color The color of the section (optional).
 * @category Database Queries
 */
export async function createDBSectionInGroup(groupId: number, title: string) {
    try {
        const db = await getDB()
        await db.execute(
            `INSERT INTO section (groupID, title, position)
             SELECT ?, ?, COALESCE(MAX(position) + 1, 0) FROM section
             WHERE groupID = ? AND deleted_at IS NULL`,
            [groupId, title, groupId]);
    } catch (error: unknown) {
        handleDBError(error, "SECTION", {
            UNIQUE: "A section with this name already exists.",
            CHECK: "The section name cannot be empty.",
        })
    }
}

/**
 * Creates a new section in the database.
 * @param workspaceId The ID of the workspace to which the section belongs.
 * @param name The name of the section.
 * @param color The color of the section (optional).
 * @category Database Queries
 */
export async function createDBSection(noteId: number, title: string, position: number) {
    try {
        const db = await getDB()

        const result = await db.execute('INSERT INTO section_group (noteID, position) VALUES (?, ?)', [noteId, position]);
        const groupId = result.lastInsertId

        try {
            await db.execute('INSERT INTO section (groupID, title) VALUES (?, ?)', [groupId, title]);
        } catch (innerError: unknown) {
            // Remove the orphan group, transactions are unreliable with the connection pool
            await db.execute('DELETE FROM section_group WHERE id=?', [groupId]).catch(() => undefined)
            throw innerError
        }
    } catch (error: unknown) {
        handleDBError(error, "SECTION", {
            UNIQUE: "A section with this name already exists.",
            CHECK: "The section name cannot be empty.",
        })
    }
}