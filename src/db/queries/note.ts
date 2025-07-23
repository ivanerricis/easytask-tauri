import type { Group, Section, Task } from "@/types/types";
import { getDB } from "../dbManager";
import { handleDBError } from "@/types/error";

export async function getDBNoteData(noteId: number) {
    const db = await getDB();

    try {
        // 1. Prendi tutti i gruppi della nota
        const groups = await db.select<Group[]>(
            'SELECT * FROM section_group WHERE note_id = ? ORDER BY position',
            [noteId]
        );

        // 2. Funzione ricorsiva per recuperare i task
        const getTasksRecursively = async (sectionId: number, parentTaskId: number | null = null): Promise<Task[]> => {
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
    } catch (error: any) {
        console.log(error);
    }
}

/**
 * Creates a new note in the database.
 * @param workspaceId The ID of the workspace to which the note belongs.
 * @param name The name of the note.
 * @param color The color of the note (optional).
 * @category Database
 */
export async function createDBWorkspaceNote(workspaceId: number, name: string, color?: string | null) {
    const db = await getDB()

    try {
        await db.execute('INSERT INTO note (workspace_id, name, color) VALUES (?, ?, ?)', [workspaceId, name, color ?? null]);
    } catch (error: any) {
        handleDBError(error, "NOTE", {
            UNIQUE: "A note with this name already exists.",
            CHECK: "The note name cannot be empty.",
        })
    }
}

/**
 * Creates a new note in a specific folder.
 * @param folderId The ID of the folder where the note will be created.
 * @param name The name of the note.
 * @param color The color of the note (optional).
 * @category Database
 */
export async function createDBNoteInFolder(folderId: number, name: string) {
    const db = await getDB()

    try {
        await db.execute('INSERT INTO note (folder_id, name) VALUES (?, ?)', [folderId, name]);
    } catch (error: any) {
        handleDBError(error, "NOTE", {
            UNIQUE: "A note with this name already exists.",
            CHECK: "The note name cannot be empty.",
        })
    }
}