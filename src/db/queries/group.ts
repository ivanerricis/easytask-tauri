import type { Group } from "@/types/types";
import { getDB } from "../dbManager";
import { createError } from "@/types/error";
import { getErrorMessage } from "@/lib/utils";

/**
 * Updates the positions of multiple groups in the database.
 * @param groups The list of groups to update.
 * @returns A promise that resolves when the update is complete.
 * @category Database Queries
 */
export async function updateDBGroupPositions(groups: Group[]) {
    try {
        const db = await getDB()
        for (const group of groups) {
            await db.execute('UPDATE section_group SET position=? WHERE id=?', [group.position, group.id])
        }
    } catch (error: unknown) {
        throw createError('GROUP_UPDATE_ERROR', 'An error occurred while updating group positions: ' + getErrorMessage(error))
    }
}