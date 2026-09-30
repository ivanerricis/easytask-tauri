import type { Group } from "@/types/types";
import { getDB } from "../dbManager";
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
        await db.execute(
            `INSERT INTO section_group (noteID, name, position)
             SELECT ?, ?, COALESCE(MAX(position) + 1, 0) FROM section_group WHERE noteID = ? AND deleted_at IS NULL`,
            [noteId, name.trim() || null, noteId])
    } catch (error: unknown) {
        throw createError('GROUP_CREATE_ERROR', 'Impossibile creare il gruppo: ' + getErrorMessage(error))
    }
}

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