import i18n from "@/i18n"
import { createError, handleDBError } from "@/types/error"
import { getDB } from "../dbManager"
import { getErrorMessage } from "@/lib/utils"
import type { NewTaskPosition } from "@/lib/store/preferences"

/**
 * SQL of the position of a new row among its siblings: after the last one, or before the first one ("top": one below the
 * lowest position, so the siblings are not renumbered and the order stays valid for restore from the trash and for the
 * moves, which renumber the whole list anyway). The siblings are selected by `where`, an empty list starts at 0.
 */
const newPositionSql = (position: NewTaskPosition, from: string, where: string) =>
    position === "top"
        ? `COALESCE((SELECT MIN(position) - 1 FROM ${from} WHERE ${where}), 0)`
        : `COALESCE((SELECT MAX(position) + 1 FROM ${from} WHERE ${where}), 0)`

/**
 * Creates a new top level task in a section, after its siblings or before them.
 * @param sectionId The ID of the section to which the task belongs.
 * @param text The text of the task.
 * @param position Where the task goes among its siblings (default: at the end).
 * @category Database
 */
export async function createDBTask(sectionId: number, text: string, position: NewTaskPosition = "bottom") {
    try {
        const db = await getDB()
        const result = await db.execute(
            `INSERT INTO task (sectionID, text, position)
             SELECT ?, ?, ${newPositionSql(position, "task", "sectionID = ? AND taskID IS NULL AND deleted_at IS NULL")}`,
            [sectionId, text, sectionId])
        return result.lastInsertId as number
    } catch (error: unknown) {
        handleDBError(error, "TASK", {
            UNIQUE: i18n.t("errors.task.unique"),
            CHECK: i18n.t("errors.task.check"),
        })
    }
}

/**
 * Creates a new subtask, after its siblings or before them, in the same section as the parent.
 * @param taskId The ID of the task to create a subtask for.
 * @param text The text of the subtask.
 * @param position Where the subtask goes among its siblings (default: at the end).
 * @category Database
 */
export async function createDBSubTask(taskId: number, text: string, position: NewTaskPosition = "bottom") {
    let result: { rowsAffected: number, lastInsertId?: number }
    try {
        const db = await getDB()
        result = await db.execute(
            `INSERT INTO task (sectionID, taskID, text, position)
             SELECT sectionID, id, ?, ${newPositionSql(position, "task", "taskID = ? AND deleted_at IS NULL")}
             FROM task WHERE id = ? AND deleted_at IS NULL`,
            [text, taskId, taskId])
    } catch (error: unknown) {
        handleDBError(error, "TASK", {
            UNIQUE: i18n.t("errors.task.unique"),
            CHECK: i18n.t("errors.task.check"),
        })
    }
    // The parent is missing or in the trash: nothing was inserted
    if (result.rowsAffected !== 1)
        throw createError("TASK_PARENT_MISSING", i18n.t("errors.task.parentMissing"))
    return result.lastInsertId as number
}

/**
 * Edits the priority of an existing task in the database.
 * @param id The ID of the task to edit.
 * @param priority The new priority of the task.
 * @category Database
 */
export async function updateDBTaskPriority(taskId: number, priority: boolean) {
    try {
        const db = await getDB()
        await db.execute('UPDATE task SET priority=? WHERE id=?', [priority ? 1 : 0, taskId])
    } catch (error: unknown) {
        handleDBError(error, "TASK", {
            UNIQUE: i18n.t("errors.task.unique"),
            CHECK: i18n.t("errors.task.check"),
        })
    }
}

/**
 * Edits the completion status of an existing task in the database.
 * @param id The ID of the task to edit.
 * @param isComplited The new completion status of the task.
 * @category Database
 */
export async function updateDBTaskCompletion(taskId: number, isCompleted: boolean) {
    try {
        const db = await getDB()
        await db.execute('UPDATE task SET completed=? WHERE id=?', [isCompleted ? 1 : 0, taskId])
    } catch (error: unknown) {
        handleDBError(error, "TASK", {
            UNIQUE: i18n.t("errors.task.unique"),
            CHECK: i18n.t("errors.task.check"),
        })
    }
}

/**
 * Updates the description of a task in the database.
 * @param taskID ID of the task to update
 * @param description New description for the task
 * @category Database
 */
export async function updateDBTaskDescription(taskID: number, description?: string) {
    try {
        const db = await getDB()
        await db.execute('UPDATE task SET description=? WHERE id=?', [description ?? null, taskID])
    } catch (error: unknown) {
        throw createError(`TASK_DESCRIPTION_UPDATE_FAILED`, i18n.t("errors.task.descriptionUpdate", { message: getErrorMessage(error) }))
    }
}