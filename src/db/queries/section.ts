import { createError, handleDBError } from "@/types/error";
import { getDB } from "../dbManager";

/**
 * Creates a new section in a specific group.
 * @param groupId The ID of the group where the section will be created.
 * @param title The title of the section.
 * @param color The color of the section (optional).
 * @category Database
 */
export async function createDBSectionInGroup(groupId: number, title: string, color?: string | null) {
    const db = await getDB()

    try {
        await db.execute('INSERT INTO section (group_id, title, color) VALUES (?, ?, ?)', [groupId, title, color ?? null]);
    } catch (error: any) {
        handleDBError(error, "SECTION", {
            UNIQUE: "A section with this name already exists.",
            CHECK: "The section name cannot be empty.",
        })
    }
}

/**
 * Creates a new folder in the database.
 * @param workspaceId The ID of the workspace to which the folder belongs.
 * @param name The name of the folder.
 * @param color The color of the folder (optional).
 * @category Database
 */
export async function createDBSection(noteId: number, title: string, position: number, color?: string | null) {
    const db = await getDB()

    try {
        // await db.execute('BEGIN')

        const result = await db.execute('INSERT INTO section_group (note_id, position) VALUES (?, ?)', [noteId, position]);
        const groupId = result.lastInsertId

        await db.execute('INSERT INTO section (group_id, title, color) VALUES (?, ?, ?)', [groupId, title, color ?? null]);

        // await db.execute('COMMIT')
    } catch (error: any) {
        // await db.execute('ROLLBACK')

        handleDBError(error, "SECTION", {
            UNIQUE: "A section with this name already exists.",
            CHECK: "The section name cannot be empty.",
        })
    }
}

/**
 * Edits an existing section in the database.
 * @param id The ID of the section to edit.
 * @param title The new title of the section.
 * @param color The new color of the section (optional).
 * @param archived The new archived status of the section (optional).
 * @category Database
 */
export async function editDBSection(id: number, title: string, color?: string | null, archived?: boolean | null) {
    const db = await getDB()

    try {
        await db.execute('UPDATE section SET title=?, color=?, archived=? WHERE id=?', [title, color ?? null, archived ?? null, id])
    } catch (error: any) {
        handleDBError(error, "SECTION", {
            UNIQUE: "A section with this name already exists.",
            CHECK: "The section name cannot be empty.",
        })
    }
}

/**
 * Deletes a section from the database.
 * If the section is the last one in its group, the group will also be deleted.
 * @param id The ID of the section to delete.
 * @category Database
 */
export async function deleteDBSection(id: number) {
    const db = await getDB()

    try {
        const groupQuery = await db.select<{ group_id: number }[]>('SELECT group_id FROM section WHERE id=?', [id])
        const count = await db.select<{ count: number }[]>('SELECT COUNT(*) as count FROM section WHERE group_id=?', [groupQuery[0].group_id])

        if (count[0].count !== 1)
            await db.execute('DELETE FROM section WHERE id=?', [id])
        else
            await db.execute('DELETE FROM section_group WHERE id=?', [groupQuery[0].group_id])
    } catch (error: any) {
        throw createError('UNKNOWN_ERROR', 'An unknown error occurred while deleting the section: ' + error.message)
    }
}