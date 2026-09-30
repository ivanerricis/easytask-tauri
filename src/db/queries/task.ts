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
            UNIQUE: "A task with this name already exists.",
            CHECK: "The task name cannot be empty.",
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
    try {
        const db = await getDB()
        const result = await db.execute(
            `INSERT INTO task (sectionID, taskID, text, position)
             SELECT sectionID, id, ?, COALESCE((SELECT MAX(position) + 1 FROM task WHERE taskID = ? AND deleted_at IS NULL), 0)
             FROM task WHERE id = ?`,
            [text, taskId, taskId])
        return result.lastInsertId as number
    } catch (error: unknown) {
        handleDBError(error, "TASK", {
            UNIQUE: "A task with this name already exists.",
            CHECK: "The task name cannot be empty.",
        })
    }
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
            UNIQUE: "A task with this name already exists.",
            CHECK: "The task name cannot be empty.",
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
            UNIQUE: "A task with this name already exists.",
            CHECK: "The task name cannot be empty.",
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
        throw createError(`TASK_DESCRIPTION_UPDATE_FAILED`, "Failed to update task description: " + getErrorMessage(error))
    }
}