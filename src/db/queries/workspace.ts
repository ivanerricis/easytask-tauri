import type { Workspace } from "@/types/types";
import { getDB } from "../dbManager"
import { handleDBError } from "@/types/error";

export async function getDBWorkspaceData(workspaceId: number) {
    try {
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
    } catch (error) {
        console.log(error)
    }
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
        handleDBError(error, "ERROR_ON_GET_WORKSPACE", {
            UNIQUE: "A workspace with this name already exists.",
            CHECK: "The workspace name cannot be empty.",
        })
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
        handleDBError(error, "WORKSPACE", {
            UNIQUE: "A workspace with this name already exists.",
            CHECK: "The workspace name cannot be empty.",
        })
    }
}