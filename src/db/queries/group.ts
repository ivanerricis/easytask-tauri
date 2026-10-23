import i18n from "@/i18n"
import type { Group } from "@/types/types";
import { Transaction } from "../transaction";
import { addPositions } from "./ordering";
import { DEFAULT_SECTION_SQL } from "./sql";
import { createError } from "@/types/error";
import { getErrorMessage } from "@/lib/utils";

/**
 * Creates an empty group at the end of a note, together with its hidden default section
 * (the one that holds the tasks created directly in the group), in one transaction.
 * @param noteId The ID of the note that will contain the group.
 * @param name The name of the group; an empty or blank name leaves the group unnamed.
 * @returns The ids of the new group and of its default section.
 * @category Database Queries
 */
export async function createDBGroup(noteId: number, name: string) {
    try {
        const tx = new Transaction()
        const group = tx.add(
            `INSERT INTO section_group (noteID, name, position)
             SELECT ?, ?, COALESCE(MAX(position) + 1, 0) FROM section_group WHERE noteID = ? AND deleted_at IS NULL`,
            [noteId, name.trim() || null, noteId])
        const section = tx.add(DEFAULT_SECTION_SQL, [tx.idOf(group)])
        const results = await tx.run()
        return { groupId: results[group].lastInsertId, defaultSectionId: results[section].lastInsertId }
    } catch (error: unknown) {
        throw createError('GROUP_CREATE_ERROR', i18n.t("errors.group.create", { message: getErrorMessage(error) }))
    }
}

/**
 * Updates the positions of multiple groups in the database (one UPDATE, so all together).
 * The groups are renumbered 0..n-1 following the order of their `position`.
 * @param groups The list of groups to update.
 * @returns A promise that resolves when the update is complete.
 * @category Database Queries
 */
export async function updateDBGroupPositions(groups: Group[]) {
    try {
        if (groups.length === 0) return
        // Positions are assigned sequentially in the order of the given positions
        const ordered = [...groups].sort((a, b) => a.position - b.position)
        const tx = new Transaction()
        addPositions(tx, "section_group", ordered.map(group => group.id))
        await tx.run()
    } catch (error: unknown) {
        throw createError('GROUP_UPDATE_ERROR', i18n.t("errors.group.updatePositions", { message: getErrorMessage(error) }))
    }
}

/**
 * Sets the width of a group, or clears it (null = back to the width driven by the content).
 * @param groupId The ID of the group.
 * @param width The width in pixels (greater than zero), or null.
 * @category Database Queries
 */
export async function updateDBGroupWidth(groupId: number, width: number | null) {
    try {
        const db = await getDB()
        await db.execute("UPDATE section_group SET width = ? WHERE id = ?", [width, groupId])
    } catch (error: unknown) {
        throw createError('GROUP_UPDATE_ERROR', i18n.t("errors.group.updateWidth", { message: getErrorMessage(error) }))
    }
}