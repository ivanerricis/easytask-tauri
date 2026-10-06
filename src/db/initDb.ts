import type Database from "@tauri-apps/plugin-sql";
import i18n from "@/i18n";
import { APPLICATION_ID, initialSchema } from "./schema/initial";
import { addGroupColorColumn } from "./schema/section_group";
import { createWorkspaceEditTriggers } from "./schema/workspace_edit";

/**
 * Ordered list of migrations, applied once each and tracked with PRAGMA user_version.
 * The first one creates the whole initial schema (the previous v1-v8 migrations were squashed into it).
 * Every migration must be idempotent and additive: never edit an applied one, append a new one.
 * @category Database
 */
const migrations: string[][] = [
    // v1: initial schema
    initialSchema,
    // v2: color of the groups
    [addGroupColorColumn],
    // v3: any change inside a workspace refreshes its edit date/time
    createWorkspaceEditTriggers,
];

/**
 * Highest schema version this build knows (the number of migrations); a database with a greater user_version is newer.
 * @category Database
 */
export const LATEST_SCHEMA_VERSION = migrations.length;

export { APPLICATION_ID };

/**
 * Error thrown when the database file was created by an older, incompatible version of the app.
 * @category Database
 */
export const legacyDbMessage = () => i18n.t("errors.db.legacy");

/**
 * Error thrown when the database file was created by a newer version of the app.
 * @category Database
 */
export const newerDbMessage = () => i18n.t("errors.db.newer");

export type InitDbOptions = {
    /**
     * Called once, before the first migration is applied, only when an existing database (user_version > 0) has
     * migrations to run: the place to take a safety copy. A rejection aborts the migration.
     */
    beforeMigrate?: (db: Database, fromVersion: number, toVersion: number) => Promise<void>
}

/**
 * Applies the pending migrations to the database.
 * Databases created before the migrations were squashed (user_version > 0 without the EasyTask
 * application_id) are rejected with a clear error instead of being touched.
 * Errors are rethrown, so a half-initialized database is retried on the next start.
 * @param db Database instance to migrate.
 * @param options See {@link InitDbOptions}.
 * @category Database
 */
export async function initDB(db: Database, options: InitDbOptions = {}) {
    const versionRows = await db.select<{ user_version: number }[]>("PRAGMA user_version");
    const current = versionRows[0]?.user_version ?? 0;

    if (current > 0) {
        const idRows = await db.select<{ application_id: number }[]>("PRAGMA application_id");
        if ((idRows[0]?.application_id ?? 0) !== APPLICATION_ID)
            throw new Error(legacyDbMessage());
    }
    if (current > migrations.length)
        throw new Error(newerDbMessage());

    if (current > 0 && current < migrations.length)
        await options.beforeMigrate?.(db, current, migrations.length);

    for (let version = current; version < migrations.length; version++) {
        for (const query of migrations[version]) {
            try {
                await db.execute(query);
            } catch (err: unknown) {
                // ALTER TABLE ADD COLUMN has no IF NOT EXISTS: a run interrupted before the version bump is retried safely
                if (/^\s*ALTER TABLE/i.test(query) && /duplicate column name/i.test(String((err as { message?: unknown })?.message ?? err)))
                    continue
                console.error(`Migration v${version + 1} failed on query: ${query}`, err);
                throw err;
            }
        }
        await db.execute(`PRAGMA user_version = ${version + 1}`);
    }
}
