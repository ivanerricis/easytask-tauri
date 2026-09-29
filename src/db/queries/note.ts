import type { Group, Section, Task } from "@/types/types";
import { getDB } from "../dbManager";
import { handleDBError } from "@/types/error";


/**
 * Retrieves the data for a specific note from the database.
 * @param noteId The ID of the note for which to retrieve data.
 * @returns The note data, including groups, sections, and tasks.
 * @category Database
 */
export async function getDBNoteData(noteId: number) {
    try {
        const db = await getDB()
        const groups = await db.select<Group[]>('SELECT * FROM section_group WHERE noteID=? ORDER BY position', [noteId])
        const sections = await db.select<Section[]>('SELECT * from section WHERE groupID IN (SELECT id FROM section_group WHERE noteID=?)', [noteId])
        const tasks = await db.select<Task[]>(`
            SELECT * FROM task WHERE sectionID IN (
            SELECT id FROM section WHERE groupID IN (
            SELECT id from section_group WHERE noteID=?))`, [noteId]);
        return { groups, sections, tasks }
    } catch (error: unknown) {
        console.log(error)
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
    try {
        const db = await getDB()
        await db.execute('INSERT INTO note (workspaceID, name, color) VALUES (?, ?, ?)', [workspaceId, name, color ?? null]);
    } catch (error: unknown) {
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
    try {
        const db = await getDB()
        await db.execute('INSERT INTO note (folderID, name) VALUES (?, ?)', [folderId, name]);
    } catch (error: unknown) {
        handleDBError(error, "NOTE", {
            UNIQUE: "A note with this name already exists.",
            CHECK: "The note name cannot be empty.",
        })
    }
}