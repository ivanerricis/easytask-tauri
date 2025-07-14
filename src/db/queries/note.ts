import type { Group, Section, Task } from "@/types";
import { getDB } from "../dbManager";

export async function getDBNoteData(noteId: number) {
    const db = await getDB();

    // 1. Prendi tutti i gruppi della nota
    const groups = await db.select<Group[]>(
        'SELECT * FROM section_group WHERE note_id = ? ORDER BY position',
        [noteId]
    );

    // 2. Funzione ricorsiva per recuperare i task
    const getTasksRecursively = async (sectionId: number, parentTaskId: number | null = null): Promise<any[]> => {
        const tasks = await db.select<Task[]>(
            'SELECT * FROM task WHERE section_id = ? AND task_id IS ?',
            [sectionId, parentTaskId]
        );

        return await Promise.all(
            tasks.map(async task => ({
                ...task,
                subtasks: await getTasksRecursively(sectionId, task.id)
            }))
        );
    };

    // 3. Per ogni gruppo, prendi le section e le task ricorsive
    const fullGroups = await Promise.all(
        groups.map(async group => {
            const sections = await db.select<Section[]>(
                'SELECT * FROM section WHERE group_id = ?',
                [group.id]
            );

            const sectionsWithTasks = await Promise.all(
                sections.map(async section => ({
                    ...section,
                    tasks: await getTasksRecursively(section.id)
                }))
            );

            return {
                ...group,
                sections: sectionsWithTasks
            };
        })
    );

    return { groups: fullGroups };
}

export async function createDBWorkspaceNote(workspaceId: number, name: string, color?: string | null) {
    const db = await getDB()

    try {
        await db.execute('INSERT INTO note (workspace_id, name, color) VALUES (?, ?, ?)', [workspaceId, name, color ?? null]);
    } catch (error: any) {
        const errorMessage = String(error)
        if (errorMessage.includes('UNIQUE')) {
            throw new Error('NOTE_EXISTS')
        }
        else if (errorMessage.includes('CHECK')) {
            throw new Error('EMPTY_NAME')
        }
        else {
            throw new Error(error)
        }
    }
}

export async function createDBNoteInFolder(folderId: number, name: string, color?: string | null) {
    const db = await getDB()

    try {
        await db.execute('INSERT INTO note (folder_id, name, color) VALUES (?, ?, ?)', [folderId, name, color ?? null]);
    } catch (error: any) {
        const errorMessage = String(error)
        if (errorMessage.includes('UNIQUE')) {
            throw new Error('NOTE_EXISTS')
        }
        else if (errorMessage.includes('CHECK')) {
            throw new Error('EMPTY_NAME')
        }
        else {
            throw new Error(error)
        }
    }
}

export async function editDBNote(noteId: number, name: string, color: string) {
    const db = await getDB()

    try {
        if (color)
            await db.execute('UPDATE note SET name=?, color=? WHERE id=?', [name, color, noteId]);
        else
            await db.execute('UPDATE note SET name=? WHERE id=?', [name, noteId]);
    } catch (error: any) {
        const errorMessage = String(error)
        if (errorMessage.includes('UNIQUE')) {
            throw new Error('NOTE_EXISTS')
        }
        else if (errorMessage.includes('CHECK')) {
            throw new Error('EMPTY_NAME')
        }
        else {
            throw new Error(error)
        }
    }
}

export async function deleteDBNote(id: number) {
    const db = await getDB()

    try {
        await db.execute('DELETE FROM note WHERE id=?', [id])
    } catch (error: any) {
        throw new Error(error)
    }
}