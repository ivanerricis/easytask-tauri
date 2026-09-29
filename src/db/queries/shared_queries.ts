import { createError, handleDBError } from "@/types/error";
import { getDB } from "../dbManager";
import { getErrorMessage } from "@/lib/utils";

const ITEM_TYPES = ["workspace", "folder", "note", "section", "section_group", "task"] as const

/**
 * Tables that the shared queries are allowed to operate on.
 * @category Database Queries
 */
export type DBItemType = typeof ITEM_TYPES[number]

// Guards the table name interpolated into the SQL strings
function assertItemType(itemType: string): asserts itemType is DBItemType {
    if (!(ITEM_TYPES as readonly string[]).includes(itemType))
        throw createError("INVALID_ITEM_TYPE", `Unsupported item type: ${itemType}`)
}

/**
 * Renames an item in the database.
 * @param itemType Type of item to rename (e.g., 'task', 'section').
 * @param itemID ID of the item to rename.
 * @param name New name value
 * @category Database Queries
 */
export async function renameDBItem(itemType: DBItemType, itemID: number, name: string) {
    assertItemType(itemType)
    const db = await getDB()

    try {
        if (itemType === "section")
            await db.execute('UPDATE ' + itemType + ' SET title=? WHERE id=?', [name, itemID])
        else if (itemType === "task")
            await db.execute('UPDATE ' + itemType + ' SET text=? WHERE id=?', [name, itemID])
        else
            await db.execute('UPDATE ' + itemType + ' SET name=? WHERE id=?', [name, itemID])
    } catch (error: unknown) {
        handleDBError(error, itemType.toUpperCase(), {
            UNIQUE: "An item with this name already exists.",
            CHECK: "The name cannot be empty.",
        })
    }
}

/**
 * Updates the color of an item in the database.
 * @param itemType Type of item to update color for (e.g., 'task', 'section').
 * @param itemID ID of the item to update.
 * @param color New color value (or null to remove color)
 * @category Database Queries
 */
export async function updateDBColor(itemType: DBItemType, itemID: number, color?: string | null) {
    assertItemType(itemType)
    const db = await getDB()

    try {
        await db.execute('UPDATE ' + itemType + ' SET color=? WHERE id=?', [color ?? null, itemID])
    } catch (error: unknown) {
        handleDBError(error, itemType.toUpperCase(), {
            UNIQUE: "An item with this color already exists.",
            CHECK: "The color cannot be empty.",
        })
    }
}

/**
 * Deletes an item from the database.
 * @param itemType Type of item to delete (e.g., 'task', 'section').
 * @param itemID ID of the item to delete.
 * @category Database Queries
 */
export async function deleteDBItem(itemType: DBItemType, itemID: number) {
    assertItemType(itemType)
    const db = await getDB()

    try {
        if (itemType === 'section') {
            const groupQuery = await db.select<{ groupID: number }[]>('SELECT groupID FROM section WHERE id=?', [itemID])
            if (groupQuery.length === 0)
                return

            const groupID = groupQuery[0].groupID
            const count = await db.select<{ count: number }[]>('SELECT COUNT(*) as count FROM section WHERE groupID=?', [groupID])

            if (count[0].count !== 1)
                await db.execute('DELETE FROM section WHERE id=?', [itemID])
            else
                await db.execute('DELETE FROM section_group WHERE id=?', [groupID])
        }
        else
            await db.execute('DELETE FROM ' + itemType + ' WHERE id=?', [itemID])
    } catch (error: unknown) {
        throw createError(`${itemType.toUpperCase()}_DELETE_FAILED`, "Failed to delete item: " + getErrorMessage(error))
    }
}
