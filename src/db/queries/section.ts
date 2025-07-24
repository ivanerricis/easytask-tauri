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
    const db = await getDB()

    try {
        await db.execute('INSERT INTO section (group_id, title) VALUES (?, ?)', [groupId, title]);
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
    const db = await getDB()

    try {
        // await db.execute('BEGIN')

        const result = await db.execute('INSERT INTO section_group (note_id, position) VALUES (?, ?)', [noteId, position]);
        const groupId = result.lastInsertId

        await db.execute('INSERT INTO section (group_id, title) VALUES (?, ?)', [groupId, title]);

        // await db.execute('COMMIT')
    } catch (error: any) {
        // await db.execute('ROLLBACK')

        handleDBError(error, "SECTION", {
            UNIQUE: "A section with this name already exists.",
            CHECK: "The section name cannot be empty.",
        })
    }
}