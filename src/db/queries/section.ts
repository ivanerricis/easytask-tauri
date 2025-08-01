import { handleDBError } from "@/types/error";
import { getDB } from "../dbManager";

/**
 * Creates a new section in a specific group.
 * @param groupId The ID of the group where the section will be created.
 * @param title The title of the section.
 * @param color The color of the section (optional).
 * @category Database Queries
 */
export async function createDBSectionInGroup(groupId: number, title: string) {
    try {
        const db = await getDB()
        await db.execute('INSERT INTO section (groupID, title) VALUES (?, ?)', [groupId, title]);
    } catch (error: any) {
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
        // await db.execute('BEGIN')

        const result = await db.execute('INSERT INTO section_group (noteID, position) VALUES (?, ?)', [noteId, position]);
        const groupId = result.lastInsertId

        await db.execute('INSERT INTO section (groupID, title) VALUES (?, ?)', [groupId, title]);

        // await db.execute('COMMIT')
    } catch (error: any) {
        // await db.execute('ROLLBACK')

        handleDBError(error, "SECTION", {
            UNIQUE: "A section with this name already exists.",
            CHECK: "The section name cannot be empty.",
        })
    }
}