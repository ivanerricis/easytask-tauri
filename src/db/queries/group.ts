import type { Group } from "@/types/types";
import { getDB } from "../dbManager";
import { createError } from "@/types/error";

export async function updateDBGroupPositions(groups: Group[]) {
    const db = await getDB()

    try {
        for (const group of groups) {
            await db.execute('UPDATE section_group SET position=? WHERE id=?', [group.position, group.id])
        }
    } catch (error: any) {
        throw createError('GROUP_UPDATE_ERROR', 'An error occurred while updating group positions: ' + error.message)
    }
}