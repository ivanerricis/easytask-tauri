import type { Workspace } from "@/types";
import { getDB } from "../dbManager"

export async function getWorkspaces() {
    const db = await getDB()

    try {
        const workspaces = await db.select<Workspace>('SELECT * FROM workspace ORDER BY edit_date DESC, edit_time DESC')
        return workspaces;
    } catch (error: any) {
        throw new Error(error)
    }
}

export async function createWorkspace(name: string, color: string) {
    const db = await getDB();
    try {
        await db.execute('INSERT INTO workspace (name, color) VALUES (?, ?)',
            [name, color]
        )
    } catch (error: any) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            throw new Error('WORKSPACE_EXISTS')
        }
        else if (error.code === 'SQLITE_CONSTRAINT_CHECK') {
            throw new Error('EMPTY_NAME')
        }
        else {
            throw new Error('GENERIC_ERROR')
        }

    }
}

export async function editWorkspace(id: number, name: string, color?: string) {
    const db = await getDB()

    try {
        if (!color)
            await db.execute('UPDATE workspace SET name=? WHERE id=?',
                [name, id]
            )
        else
            await db.execute('UPDATE workspace SET name=?, color=? WHERE id=?',
                [name, color, id]
            )
    } catch (error: any) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            throw new Error('WORKSPACE_EXISTS')
        }
        else if (error.code === 'SQLITE_CONSTRAINT_CHECK') {
            throw new Error('EMPTY_NAME')
        }
        else {
            throw new Error('GENERIC_ERROR')
        }
    }
}

export async function deleteWorkspace(id: number) {
    const db = await getDB();
    try {
        await db.execute('DELETE FROM workspace WHERE id=?',
            [id]
        )
    } catch (error: any) {
        throw new Error(error)
    }
}