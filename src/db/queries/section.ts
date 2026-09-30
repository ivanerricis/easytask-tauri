import { handleDBError } from "@/types/error";
import { getDB } from "../dbManager";
import { Transaction } from "../transaction";

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
        // One transaction: a failing section leaves no orphan group behind
        const tx = new Transaction()
        const group = tx.add('INSERT INTO section_group (noteID, position) VALUES (?, ?)', [noteId, position])
        tx.add('INSERT INTO section (groupID, title) VALUES (?, ?)', [tx.idOf(group), title])
        await tx.run()
    } catch (error: unknown) {
        handleDBError(error, "SECTION", {
            UNIQUE: "A section with this name already exists.",
            CHECK: "The section name cannot be empty.",
        })
    }
}