import { getDB } from "../dbManager";

export async function createDBSectionInGroup(groupId: number, title: string, color?: string | null) {
    const db = await getDB()

    try {
        await db.execute('INSERT INTO section (group_id, title, color) VALUES (?, ?, ?)', [groupId, title, color ?? null]);
    } catch (error: any) {
        const errorMessage = String(error)
        if (errorMessage.includes('UNIQUE')) {
            throw new Error('SECTION_EXISTS')
        }
        else if (errorMessage.includes('CHECK')) {
            throw new Error('EMPTY_NAME')
        }
        else {
            throw new Error(error)
        }
    }
}

export async function createDBSection(noteId: number, title: string, position: number, color?: string | null) {
    const db = await getDB()

    try {
        // await db.execute('BEGIN')

        const result = await db.execute('INSERT INTO section_group (note_id, position) VALUES (?, ?)', [noteId, position]);
        const groupId = result.lastInsertId

        await db.execute('INSERT INTO section (group_id, title, color) VALUES (?, ?, ?)', [groupId, title, color ?? null]);

        // await db.execute('COMMIT')
    } catch (error: any) {
        // await db.execute('ROLLBACK')

        const errorMessage = String(error)
        if (errorMessage.includes('UNIQUE')) {
            throw new Error('SECTION_EXISTS')
        }
        else if (errorMessage.includes('CHECK')) {
            throw new Error('EMPTY_NAME')
        }
        else {
            throw new Error(error)
        }
    }
}

export async function editDBSection(id: number, title: string, color?: string, archived?: boolean) {
    const db = await getDB()

    try {
        if (color)
            if (archived)
                await db.execute('UPDATE section SET title=?, color=?, archived=? WHERE id=?', [title, color, archived, id])
            else
                await db.execute('UPDATE section SET title=?, color=? WHERE id=?', [title, color, id])
        else
            if (archived)
                await db.execute('UPDATE section SET title=?, archived=? WHERE id=?', [title, color, archived, id])
            else
                await db.execute('UPDATE section SET title=? WHERE id=?', [title, id])
    } catch (error: any) {
        const errorMessage = String(error)
        if (errorMessage.includes('UNIQUE')) {
            throw new Error('SECTION_EXISTS')
        }
        else if (errorMessage.includes('CHECK')) {
            throw new Error('EMPTY_NAME')
        }
        else {
            throw new Error(error)
        }
    }
}

export async function deleteDBSection(id: number) {
    const db = await getDB()

    try {
        const groupQuery = await db.select<{ group_id: number }[]>('SELECT group_id FROM section WHERE id=?', [id])
        const count = await db.select<{ count: number }[]>('SELECT COUNT(*) as count FROM section WHERE group_id=?', [groupQuery[0].group_id])

        if (count[0].count !== 1)
            await db.execute('DELETE FROM section WHERE id=?', [id])
        else
            await db.execute('DELETE FROM section_group WHERE id=?', [groupQuery[0].group_id])
    } catch (error: any) {
        throw new Error(error)
    }
}