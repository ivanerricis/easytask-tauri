import { createError, handleDBError } from "@/types/error"
import { getDB } from "../dbManager"
import { getErrorMessage } from "@/lib/utils"

/**
 * Creates a new task in the database.
 * @param sectionId The ID of the section to which the task belongs.
 * @param text The text of the task.
 * @param color The color of the task (optional).
 * @category Database
 */
export async function createDBTask(sectionId: number, text: string) {
    try {
        const db = await getDB()
        await db.execute('INSERT INTO task (sectionID, text) VALUES (?, ?)', [sectionId, text])
    } catch (error: unknown) {
        handleDBError(error, "TASK", {
            UNIQUE: "A task with this name already exists.",
            CHECK: "The task name cannot be empty.",
        })
    }
}

/**
 * Creates a new subtask in the database.
 * @param taskId The ID of the task to create a subtask for.
 * @param text The text of the subtask.
 * @param color The color of the subtask (optional).
 * @category Database
 */
export async function createDBSubTask(taskId: number, text: string) {
    try {
        const db = await getDB()
        await db.execute('INSERT INTO task (taskID, text) VALUES (?, ?)', [taskId, text])
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