import type Database from "@tauri-apps/plugin-sql";
import { createFolderTable } from "./schema/folder";
import { createNoteTable } from "./schema/note";
import { createSectionTable } from "./schema/section";
import { createSectionGroupTable } from "./schema/section_group";
import { createTaskTable } from "./schema/task";
import { createWorkspaceTable } from "./schema/workspace"

/**
 * Defines the schema for the database.
 * This includes the creation of tables and triggers necessary for the application.
 * @category Database
 */
const schema = [
    createWorkspaceTable,
    createFolderTable,
    createNoteTable,
    createSectionGroupTable,
    createSectionTable,
    createTaskTable,
];

/**
 * Initializes the database with the defined schema.
 * @param db Database instance to initialize with the schema.
 * @category Database
 */
export async function initDB(db: Database) {
    for (const query of schema) {
        try {
            await db.execute(query)
        } catch (error) {
            console.error(`Errore nell'eseguire la query: ${query}`, error)
        }
    }
}