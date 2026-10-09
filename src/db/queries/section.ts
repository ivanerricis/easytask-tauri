import i18n from "@/i18n"
import { handleDBError } from "@/types/error";
import { getDB } from "../dbManager";
import { Transaction } from "../transaction";

/**
 * Creates a new section in a specific group, appended after its siblings.
 * @param groupId The ID of the group where the section will be created.
 * @param title The title of the section (blank = no title, stored as NULL).
 * @param color The color of the section (optional).
 * @category Database Queries
 */
export async function createDBSectionInGroup(groupId: number, title: string) {
    try {
        const db = await getDB()
        const result = await db.execute(
            `INSERT INTO section (groupID, title, position)
             SELECT ?, ?, COALESCE(MAX(position) + 1, 0) FROM section
             WHERE groupID = ? AND deleted_at IS NULL`,
            [groupId, title.trim() || null, groupId]);
        return result.lastInsertId as number
    } catch (error: unknown) {
        handleDBError(error, "SECTION", {
            UNIQUE: i18n.t("errors.section.unique"),
            CHECK: i18n.t("errors.section.check"),
        })
    }
}

/**
 * Creates a new section in the database.
 * @param workspaceId The ID of the workspace to which the section belongs.
 * @param name The name of the section.
 * @param color The color of the section (optional).
 * @returns The ids of the new group and section.
 * @category Database Queries
 */
export async function createDBSection(noteId: number, title: string, position: number) {
    try {
        // One transaction: a failing section leaves no orphan group behind
        const tx = new Transaction()
        const group = tx.add('INSERT INTO section_group (noteID, position) VALUES (?, ?)', [noteId, position])
        const section = tx.add('INSERT INTO section (groupID, title) VALUES (?, ?)', [tx.idOf(group), title.trim() || null])
        const results = await tx.run()
        return { groupId: results[group].lastInsertId, sectionId: results[section].lastInsertId }
    } catch (error: unknown) {
        handleDBError(error, "SECTION", {
            UNIQUE: i18n.t("errors.section.unique"),
            CHECK: i18n.t("errors.section.check"),
        })
    }
}