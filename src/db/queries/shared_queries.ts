import { createError, handleDBError } from "@/types/error";
import { getDB } from "../dbManager";

// export async function createDBItem(itemType: string, itemName: string, parentType?: string, parentID?: number) {
//     const db = await getDB()

//     try {
//         if (parentType && parentID) {
//             if (itemType === "section")
//                 await db.execute(`INSERT INTO section (title, ${parentType}ID) VALUES (?, ?)`, [itemName, parentID])
//             else if (itemType === "task")
//                 await db.execute(`INSERT INTO task (text, ${parentType}ID) VALUES (?, ?)`, [itemName, parentID])
//             else
//                 await db.execute(`INSERT INTO ${itemType} (name, ${parentType}ID) VALUES (?, ?)`, [itemName, parentID])
//         }
//         else {
//             if (itemType === "workspace") {
//                 await db.execute('INSERT INTO workspace (name) VALUES (?)', [itemName])
//             }
//         }
//     } catch (error: any) {
//         console.log(error)
//         handleDBError(error, itemType.toUpperCase(), {
//             UNIQUE: "An item with this name already exists.",
//             CHECK: "The name cannot be empty.",
//         })
//     }
// }

/**
 * Renames an item in the database.
 * @param itemType Type of item to rename (e.g., 'task', 'section').
 * @param itemID ID of the item to rename.
 * @param name New name value
 * @category Database Queries
 */
export async function renameDBItem(itemType: string, itemID: number, name: string) {
    const db = await getDB()

    try {
        if (itemType === "section")
            await db.execute('UPDATE ' + itemType + ' SET title=? WHERE id=?', [name, itemID])
        else if (itemType === "task")
            await db.execute('UPDATE ' + itemType + ' SET text=? WHERE id=?', [name, itemID])
        else
            await db.execute('UPDATE ' + itemType + ' SET name=? WHERE id=?', [name, itemID])
    } catch (error: any) {
        console.log(error)
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
export async function updateDBColor(itemType: string, itemID: number, color?: string | null) {
    const db = await getDB()

    try {
        await db.execute('UPDATE ' + itemType + ' SET color=? WHERE id=?', [color ?? null, itemID])
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
 * @param itemID ID of the item to delete.
 * @category Database Queries
 */
export async function deleteDBItem(itemType: string, itemID: number) {
    const db = await getDB()

    try {
        if (itemType === 'section') {
            const groupQuery = await db.select<{ groupID: number }[]>('SELECT groupID FROM section WHERE id=?', [itemID])
            const count = await db.select<{ count: number }[]>('SELECT COUNT(*) as count FROM section WHERE groupID=?', [groupQuery[0].groupID])

            if (count[0].count !== 1)
                await db.execute('DELETE FROM section WHERE id=?', [itemID])
            else
                await db.execute('DELETE FROM section_group WHERE id=?', [groupQuery[0].groupID])
        }
        else
            await db.execute('DELETE FROM ' + itemType + ' WHERE id=?', [itemID])
    } catch (error: any) {
        createError(`${itemType.toUpperCase()}_DELETE_FAILED`, "Failed to delete item: " + error.message)
    }
}