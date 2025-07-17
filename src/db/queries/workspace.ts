import type { Workspace } from "@/types/types";
import { getDB } from "../dbManager"
import { createError } from "@/types/error";

export async function getDBWorkspaceData(workspaceId: number) {
    const db = await getDB();

    const allFolders: any[] = await db.select(`
        SELECT * FROM folder WHERE workspace_id = ? OR folder_id IS NOT NULL
    `, [workspaceId]);

    const allNotes: any[] = await db.select(`
        SELECT * FROM note 
        WHERE workspace_id = ? 
           OR folder_id IN (SELECT id FROM folder WHERE workspace_id = ? OR folder_id IS NOT NULL)
    `, [workspaceId, workspaceId])

    const folderMap = new Map<number, any>();
    const folderChildrenMap = new Map<number, any[]>();
    const folderNotesMap = new Map<number, any[]>();
    const rootFolders: any[] = [];

    for (const folder of allFolders) {
        folder.subfolders = [];
        folder.notes = [];
        folderMap.set(folder.id, folder);

        if (folder.folder_id != null) {
            if (!folderChildrenMap.has(folder.folder_id)) {
                folderChildrenMap.set(folder.folder_id, []);
            }
            folderChildrenMap.get(folder.folder_id)!.push(folder);
        } else {
            rootFolders.push(folder);
        }
    }

    for (const note of allNotes) {
        const noteWithGroups = { ...note, groups: [] };
        if (note.folder_id != null) {
            if (!folderNotesMap.has(note.folder_id)) {
                folderNotesMap.set(note.folder_id, []);
            }
            folderNotesMap.get(note.folder_id)!.push(noteWithGroups);
        }
    }

    function attachSubfolders(folder: any) {
        folder.notes = folderNotesMap.get(folder.id) || [];
        folder.subfolders = folderChildrenMap.get(folder.id) || [];
        for (const subfolder of folder.subfolders) {
            attachSubfolders(subfolder);
        }
    }

    for (const folder of rootFolders) {
        attachSubfolders(folder);
    }

    const notesWithoutFolder = allNotes
        .filter(note => note.folder_id == null)
        .map(note => ({ ...note, groups: [] }));

    return {
        folders: rootFolders,
        notes: notesWithoutFolder,
    };
}

/**
 * Retrieves all workspaces from the database.
 * @returns A list of all workspaces ordered by edit date and time.
 * @category Database Queries
 */
export async function getDBWorkspaces() {
    const db = await getDB()

    try {
        return await db.select<Workspace[]>('SELECT * FROM workspace ORDER BY edit_date DESC, edit_time DESC')
    } catch (error: any) {
        throw createError("ERROR_ON_GET_WORKSPACE", "Error while retrieving workspaces: " + error.message)
    }
}

/**
 * Creates a new workspace in the database.
 * @param name The name of the workspace.
 * @param color The color of the workspace (optional).
 * @category Database Queries
 */
export async function createDBWorkspace(name: string, color?: string | null) {
    const db = await getDB();

    try {
        await db.execute('INSERT INTO workspace (name, color) VALUES (?, ?)', [name, color ?? null])
    } catch (error: any) {
        const errorMessage = String(error)
        if (errorMessage.includes('UNIQUE')) {
            throw createError('WORKSPACE_EXISTS', 'A workspace with this name already exists.')
        }
        else if (errorMessage.includes('CHECK')) {
            throw createError('EMPTY_NAME', 'The workspace name cannot be empty.')
        }
        else {
            throw createError('UNKNOWN_ERROR', 'An unknown error occurred: ' + error.message)
        }

    }
}

/**
 * Edits an existing workspace in the database.
 * @param id The ID of the workspace to edit.
 * @param name The new name of the workspace.
 * @param color The new color of the workspace (optional).
 * @category Database Queries
 */
export async function editDBWorkspace(id: number, name: string, color?: string | null) {
    const db = await getDB()

    try {
        await db.execute('UPDATE workspace SET name=?, color=? WHERE id=?', [name, color ?? null, id])
    } catch (error: any) {
        const errorMessage = String(error)
        if (errorMessage.includes('UNIQUE')) {
            throw createError('WORKSPACE_EXISTS', 'A workspace with this name already exists.')
        }
        else if (errorMessage.includes('CHECK')) {
            throw createError('EMPTY_NAME', 'The workspace name cannot be empty.')
        }
        else {
            throw createError('UNKNOWN_ERROR', 'An unknown error occurred: ' + error.message)
        }
    }
}

/**
 * Deletes a workspace from the database.
 * @param id The ID of the workspace to delete.
 * @category Database Queries
 */
export async function deleteDBWorkspace(id: number) {
    const db = await getDB();

    try {
        await db.execute('DELETE FROM workspace WHERE id=?', [id])
    } catch (error: any) {
        throw createError('UNKNOWN_ERROR', 'An unknown error occurred: ' + error.message)
    }
}