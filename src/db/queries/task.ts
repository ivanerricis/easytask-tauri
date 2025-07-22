import { handleDBError } from "@/types/error"
import { getDB } from "../dbManager"

/**
 * Creates a new task in the database.
 * @param sectionId The ID of the section to which the task belongs.
 * @param text The text of the task.
 * @param color The color of the task (optional).
 * @category Database
 */
export async function createDBTask(sectionId: number, text: string, color?: string | null) {
    const db = await getDB()

    try {
        await db.execute('INSERT INTO task (section_id, text, color) VALUES (?, ?, ?)', [sectionId, text, color ?? null])
    } catch (error: any) {
        const errorMessage = String(error)
        console.log(errorMessage)
        if (errorMessage.includes('UNIQUE')) {
            throw new Error('TASK_EXISTS')
        }
        else if (errorMessage.includes('CHECK')) {
            throw new Error('EMPTY_NAME')
        }
        else {
            throw new Error(error)
        }
    }
}

/**
 * Creates a new subtask in the database.
 * @param taskId The ID of the task to create a subtask for.
 * @param text The text of the subtask.
 * @param color The color of the subtask (optional).
 * @category Database
 */
export async function createDBSubTask(taskId: number, text: string, color?: string | null) {
    const db = await getDB()

    try {
        await db.execute('INSERT INTO task (task_id, text, color) VALUES (?, ?, ?)', [taskId, text, color ?? null])
    } catch (error: any) {
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
export async function editDBTaskPriority(taskId: number, priority: boolean) {
    const db = await getDB()

    try {
        await db.execute('UPDATE task SET priority=? WHERE id=?', [priority ? 1 : 0, taskId])
    } catch (error: any) {
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
export async function editDBTaskCompletion(taskId: number, isCompleted: boolean) {
    const db = await getDB()

    try {
        await db.execute('UPDATE task SET completed=? WHERE id=?', [isCompleted ? 1 : 0, taskId])
    } catch (error: any) {
        handleDBError(error, "TASK", {
            UNIQUE: "A task with this name already exists.",
            CHECK: "The task name cannot be empty.",
        })
    }
}