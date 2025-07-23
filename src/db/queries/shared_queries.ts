import { createError, handleDBError } from "@/types/error";
import { getDB } from "../dbManager";

/**
 * Renames an item in the database.
 * @param itemType Type of item to rename (e.g., 'task', 'section').
 * @param itemId ID of the item to rename.
 * @param name New name value
 * @category Database Queries
 */
export async function renameDBItem(itemType: string, itemId: number, name: string) {
    const db = await getDB()

    try {
        if(itemType === "section")
            await db.execute('UPDATE ' + itemType + ' SET title=? WHERE id=?', [name, itemId])
        if(itemType === "task")
            await db.execute('UPDATE ' + itemType + ' SET text=? WHERE id=?', [name, itemId])
        else
            await db.execute('UPDATE ' + itemType + ' SET name=? WHERE id=?', [name, itemId])
    } catch (error: any) {

    }
}

/**
 * Updates the color of an item in the database.
 * @param itemType Type of item to update color for (e.g., 'task', 'section').
 * @param itemId ID of the item to update.
 * @param color New color value (or null to remove color)
 * @category Database Queries
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
 * @category Database Queries
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