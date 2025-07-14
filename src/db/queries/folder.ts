import { getDB } from "../dbManager";

export async function createDBWorkspaceFolder(workspaceId: number, name: string, color?: string | null) {
    const db = await getDB()

    try {
        await db.execute('INSERT INTO folder (workspace_id, name, color) VALUES (?, ?, ?)', [workspaceId, name, color ?? null])
    } catch (error: any) {
        const errorMessage = String(error)
        if (errorMessage.includes('UNIQUE')) {
            throw new Error('FOLDER_EXISTS')
        }
        else if (errorMessage.includes('CHECK')) {
            throw new Error('EMPTY_NAME')
        }
        else {
            throw new Error(error)
        }
    }
}

export async function createDBSubFolder(folderId: number, name: string, color?: string | null) {
    const db = await getDB()

    try {
        await db.execute('INSERT INTO folder (folder_id, name, color) VALUES (?, ?, ?)', [folderId, name, color ?? null])
    } catch (error: any) {
        const errorMessage = String(error)
        console.log(errorMessage)
        if (errorMessage.includes('UNIQUE')) {
            throw new Error('FOLDER_EXISTS')
        }
        else if (errorMessage.includes('CHECK')) {
            throw new Error('EMPTY_NAME')
        }
        else {
            throw new Error(error)
        }
    }
}

export async function editDBFolder(folderId: number, name: string, color: string) {
    const db = await getDB()

    try {
        if (color)
            await db.execute('UPDATE folder SET name=?, color=? WHERE id=?', [name, color, folderId])
        else
            await db.execute('UPDATE folder SET name=? WHERE id=?', [name, folderId])
    } catch (error: any) {
        const errorMessage = String(error)
        if (errorMessage.includes('UNIQUE')) {
            throw new Error('FOLDER_EXISTS')
        }
        else if (errorMessage.includes('CHECK')) {
            throw new Error('EMPTY_NAME')
        }
        else {
            throw new Error(error)
        }
    }
}

export async function deleteDBFolder(id: number) {
    const db = await getDB()

    try {
        await db.execute('DELETE FROM folder WHERE id=?', [id])
    } catch (error: any) {
        throw new Error(error)
    }
}