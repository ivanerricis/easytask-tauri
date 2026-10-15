import i18n from "@/i18n"
import { createError, handleDBError } from "@/types/error"
import { getDB } from "../dbManager"
import { getErrorMessage } from "@/lib/utils"

/**
 * Creates a new top level task in a section, appended after its siblings.
 * @param sectionId The ID of the section to which the task belongs.
 * @param text The text of the task.
 * @param color The color of the task (optional).
 * @category Database
 */
export async function createDBTask(sectionId: number, text: string) {
    try {
        const db = await getDB()
        const result = await db.execute(
            `INSERT INTO task (sectionID, text, position)
             SELECT ?, ?, COALESCE(MAX(position) + 1, 0) FROM task
             WHERE sectionID = ? AND taskID IS NULL AND deleted_at IS NULL`,
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
 * Creates a new subtask, appended after its siblings and in the same section as the parent.
 * @param taskId The ID of the task to create a subtask for.
 * @param text The text of the subtask.
 * @param color The color of the subtask (optional).
 * @category Database
 */
export async function createDBSubTask(taskId: number, text: string) {
    let result: { rowsAffected: number, lastInsertId?: number }
    try {
        const db = await getDB()
        result = await db.execute(
            `INSERT INTO task (sectionID, taskID, text, position)
             SELECT sectionID, id, ?, COALESCE((SELECT MAX(position) + 1 FROM task WHERE taskID = ? AND deleted_at IS NULL), 0)
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
 * Edits the completion status of an existing task in the database. It cascades: the subtasks take the same status and
 * every ancestor is completed exactly when all its subtasks are (the archived and trashed ones do not count).
 * @param id The ID of the task to edit.
 * @param isComplited The new completion status of the task.
 * @category Database
 */
export async function updateDBTaskCompletion(taskId: number, isCompleted: boolean) {
    try {
        const db = await getDB()
        const value = isCompleted ? 1 : 0
        await db.execute(
            `WITH RECURSIVE tree(id) AS (
                 SELECT ?
                 UNION ALL
                 SELECT task.id FROM task JOIN tree ON task.taskID = tree.id
                 WHERE task.deleted_at IS NULL AND task.archived_at IS NULL)
             UPDATE task SET completed = ? WHERE id IN (SELECT id FROM tree) AND completed <> ?`,
            [taskId, value, value])
        let parents = await db.select<{ taskID: number | null }[]>('SELECT taskID FROM task WHERE id=?', [taskId])
        while (parents[0]?.taskID != null) {
            const parentId = parents[0].taskID
            await db.execute(
                `UPDATE task SET completed = NOT EXISTS (
                     SELECT 1 FROM task child
                     WHERE child.taskID = task.id AND child.completed = 0 AND child.deleted_at IS NULL AND child.archived_at IS NULL)
                 WHERE id = ?`,
                [parentId])
            parents = await db.select<{ taskID: number | null }[]>('SELECT taskID FROM task WHERE id=?', [parentId])
        }
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