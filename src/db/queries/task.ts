import { getDB } from "../dbManager"

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

export async function createDBSubTask(taskId: number, text: string, color?: string | null) {
    const db = await getDB()

    try {
        await db.execute('INSERT INTO task (task_id, text, color) VALUES (?, ?, ?)', [taskId, text, color ?? null])
    } catch (error: any) {
        const errorMessage = String(error)
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

export async function deleteDBTask(id: number) {
    const db = await getDB()

    try {
        await db.execute('DELETE FROM task WHERE id=?', [id])
    } catch (error: any) {
        throw new Error(error)
    }
}