import { handleDBError } from "@/types/error"
import { getDB } from "../dbManager"

/**
 * Creates a new task in the database.
 * @param sectionId The ID of the section to which the task belongs.
 * @param text The text of the task.
 * @param color The color of the task (optional).
 * @category Database
 */
export async function createDBTask(sectionId: number, text: string) {
    const db = await getDB()

    try {
        await db.execute('INSERT INTO task (section_id, text) VALUES (?, ?)', [sectionId, text])
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
export async function createDBSubTask(taskId: number, text: string) {
    const db = await getDB()

    try {
        await db.execute('INSERT INTO task (task_id, text) VALUES (?, ?)', [taskId, text])
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
export async function updateDBTaskPriority(taskId: number, priority: boolean) {
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
export async function updateDBTaskCompletion(taskId: number, isCompleted: boolean) {
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

/**
 * Changes the text of an existing task in the database.
 * @param taskId The ID of the task to edit.
 * @param text The new text of the task.
 * @category Database
 */
export async function changeDBTaskText(taskId: number, text: string) {
    const db = await getDB()

    try {
        await db.execute('UPDATE task SET text=? WHERE id=?', [text, taskId])
    } catch (error: any) {
        handleDBError(error, "TASK", {
            UNIQUE: "A task with this text already exists.",
            CHECK: "The task text cannot be empty.",
        })
    }
}