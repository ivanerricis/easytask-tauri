import { createError, handleDBError } from "@/types/error";
import { getDB } from "../dbManager";

/**
 * Updates the color of an item in the database.
 * @param itemType Type of item to update color for (e.g., 'task', 'section').
 * @param itemId ID of the item to update.
 * @param color New color value (or null to remove color)
 * @category Database
 */
export async function updateDBColor(itemType: string, itemId: number, color?: string | null) {
    const db = await getDB()

    try {
        await db.execute('UPDATE ' + itemType + ' SET color=? WHERE id=?', [color ?? null, itemId])
    } catch (error: any) {
        console.log(error)
        handleDBError(error, itemType.toUpperCase(), {
            UNIQUE: "An item with this color already exists.",
            CHECK: "The color cannot be empty.",
        })
    }
}

/**
 * Deletes an item from the database.
 * @param itemType Type of item to delete (e.g., 'task', 'section').
 * @param itemId ID of the item to delete.
 */
export async function deleteDBItem(itemType: string, itemId: number) {
    const db = await getDB()

    try {
        if (itemType !== 'section')
            await db.execute('DELETE FROM ' + itemType + ' WHERE id=?', [itemId])
        else {
            const groupQuery = await db.select<{ group_id: number }[]>('SELECT group_id FROM section WHERE id=?', [itemId])
            const count = await db.select<{ count: number }[]>('SELECT COUNT(*) as count FROM section WHERE group_id=?', [groupQuery[0].group_id])

            if (count[0].count !== 1)
                await db.execute('DELETE FROM section WHERE id=?', [itemId])
            else
                await db.execute('DELETE FROM section_group WHERE id=?', [groupQuery[0].group_id])
        }
    } catch (error: any) {
        createError(`${itemType.toUpperCase()}_DELETE_FAILED`, "Failed to delete item: " + error.message)
    }
}