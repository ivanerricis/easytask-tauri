import type Database from "@tauri-apps/plugin-sql";
import { createFolderTable } from "./schema/folder";
import { createNoteTable } from "./schema/note";
import { createSectionTable } from "./schema/section";
import { createSectionGroupTable } from "./schema/section_group";
import { createTaskTable } from "./schema/task";
import { createWorkspaceTable } from "./schema/workspace"

const schema = [
    createWorkspaceTable,
    createFolderTable,
    createNoteTable,
    createSectionGroupTable,
    createSectionTable,
    createTaskTable,
];

export async function initDB(db: Database) {
    for (const query of schema) {
        try {
            await db.execute(query)
        } catch (error) {
            console.error(`Errore nell'eseguire la query: ${query}`, error)
        }
    }
}