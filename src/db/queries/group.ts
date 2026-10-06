import i18n from "@/i18n"
import type { Group } from "@/types/types";
import { getDB } from "../dbManager";
import { Transaction } from "../transaction";
import { buildPositionUpdate } from "./ordering";
import { createError } from "@/types/error";
import { getErrorMessage } from "@/lib/utils";

/**
 * Creates an empty group at the end of a note.
 * @param noteId The ID of the note that will contain the group.
 * @param name The name of the group; an empty or blank name leaves the group unnamed.
 * @category Database Queries
 */
export async function createDBGroup(noteId: number, name: string) {
    try {
        const db = await getDB()
        const result = await db.execute(
            `INSERT INTO section_group (noteID, name, position)
             SELECT ?, ?, COALESCE(MAX(position) + 1, 0) FROM section_group WHERE noteID = ? AND deleted_at IS NULL`,
            [noteId, name.trim() || null, noteId])
        return result.lastInsertId as number
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
        const update = buildPositionUpdate("section_group", ordered.map(group => group.id))
        const tx = new Transaction()
        tx.add(update.sql, update.params)
        await tx.run()
    } catch (error: unknown) {
        throw createError('GROUP_UPDATE_ERROR', i18n.t("errors.group.updatePositions", { message: getErrorMessage(error) }))
    }
}