import type Database from "@tauri-apps/plugin-sql";
import { createTableAudioFile } from "./schema/audio_file";
import { createFolderTable, createFolderTrigger } from "./schema/folder";
import { createNoteTable, createNoteTrigger } from "./schema/note";
import { createSectionTable, createSectionTrigger } from "./schema/section";
import { createSectionGroupTable } from "./schema/section_group";
import { createTaskTable, createTaskTrigger } from "./schema/task";
import { createWorkspaceTable, createWorkspaceTrigger } from "./schema/workspace";

/**
 * Ordered list of migrations, applied once each and tracked with PRAGMA user_version.
 * Every migration must be idempotent and additive: never edit an applied one, append a new one.
 * @category Database
 */
const migrations: string[][] = [
    // v1: tables
    [
        createWorkspaceTable,
        createFolderTable,
        createNoteTable,
        createSectionGroupTable,
        createSectionTable,
        createTaskTable,
        createTableAudioFile,
    ],
    // v2: recreate the edit timestamp triggers restricted to content columns
    [
        createWorkspaceTrigger,
        createFolderTrigger,
        createNoteTrigger,
        createSectionTrigger,
        createTaskTrigger,
    ],
];

/**
 * Applies the pending migrations to the database.
 * Errors are rethrown, so a half-initialized database is retried on the next start.
 * @param db Database instance to migrate.
 * @category Database
 */
export async function initDB(db: Database) {
    const rows = await db.select<{ user_version: number }[]>("PRAGMA user_version");
    const current = rows[0]?.user_version ?? 0;

    for (let version = current; version < migrations.length; version++) {
        for (const query of migrations[version]) {
            try {
                await db.execute(query);
            } catch (err: unknown) {
                console.error(`Migration v${version + 1} failed on query: ${query}`, err);
                throw err;
            }
        }
        await db.execute(`PRAGMA user_version = ${version + 1}`);
    }
}
