import type Database from "@tauri-apps/plugin-sql";
import { createTableAudioFile } from "./schema/audio_file";
import { createFolderTable, createFolderTrigger } from "./schema/folder";
import { createNoteTable, createNoteTrigger } from "./schema/note";
import { createSectionTable, createSectionTrigger } from "./schema/section";
import { createSectionGroupTable } from "./schema/section_group";
import { createTaskTable, createTaskTrigger } from "./schema/task";
import { createWorkspaceTable, createWorkspaceTrigger } from "./schema/workspace";
import { migrateToV3 } from "./schema/v3";
import { migrateToV4 } from "./schema/v4";
import { migrateToV5 } from "./schema/v5";
import { migrateToV6 } from "./schema/v6";
import { migrateToV7 } from "./schema/v7";

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
    // v3: soft delete, manual ordering, partial unique indexes (single script, single connection)
    [migrateToV3],
    // v4: manual ordering of sections and tasks (single script)
    [migrateToV4],
    // v5: indexes on foreign key and hierarchy columns (single script)
    [migrateToV5],
    // v6: audio files soft delete and ordering (single script)
    [migrateToV6],
    // v7: optional name of a section group (single script)
    [migrateToV7],
];

/**
 * Best effort cleanup after a failed migration script: the script may have left a transaction open
 * with foreign keys disabled on one pooled connection. The pool is closed by the caller anyway,
 * which drops every connection (and so rolls back any open transaction).
 * @param db Database instance.
 * @category Database
 */
async function recoverFromFailedScript(db: Database) {
    await db.execute("ROLLBACK").catch(() => undefined);
    await db.execute("PRAGMA foreign_keys=ON").catch(() => undefined);
}

/**
 * Options of initDB.
 * @category Database
 */
export type InitDBOptions = {
    /**
     * Called once before the pending migrations run on an existing database (version > 0).
     * If it throws, no migration is applied.
     */
    beforeMigrate?: (currentVersion: number, targetVersion: number) => Promise<void>
}

/**
 * Applies the pending migrations to the database.
 * Errors are rethrown, so a half-initialized database is retried on the next start.
 * @param db Database instance to migrate.
 * @param options Optional hooks.
 * @category Database
 */
export async function initDB(db: Database, options: InitDBOptions = {}) {
    const rows = await db.select<{ user_version: number }[]>("PRAGMA user_version");
    const current = rows[0]?.user_version ?? 0;

    if (current > 0 && current < migrations.length)
        await options.beforeMigrate?.(current, migrations.length);

    for (let version = current; version < migrations.length; version++) {
        for (const query of migrations[version]) {
            try {
                await db.execute(query);
            } catch (err: unknown) {
                console.error(`Migration v${version + 1} failed on query: ${query}`, err);
                await recoverFromFailedScript(db);
                throw err;
            }
        }
        await db.execute(`PRAGMA user_version = ${version + 1}`);
    }
}
