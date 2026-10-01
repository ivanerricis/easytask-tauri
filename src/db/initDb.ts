import type Database from "@tauri-apps/plugin-sql";
import i18n from "@/i18n";
import { APPLICATION_ID, initialSchema } from "./schema/initial";

/**
 * Ordered list of migrations, applied once each and tracked with PRAGMA user_version.
 * The first one creates the whole initial schema (the previous v1-v8 migrations were squashed into it).
 * Every migration must be idempotent and additive: never edit an applied one, append a new one.
 * @category Database
 */
const migrations: string[][] = [
    // v1: initial schema
    initialSchema,
];

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

/**
 * Applies the pending migrations to the database.
 * Databases created before the migrations were squashed (user_version > 0 without the EasyTask
 * application_id) are rejected with a clear error instead of being touched.
 * Errors are rethrown, so a half-initialized database is retried on the next start.
 * @param db Database instance to migrate.
 * @category Database
 */
export async function initDB(db: Database) {
    const versionRows = await db.select<{ user_version: number }[]>("PRAGMA user_version");
    const current = versionRows[0]?.user_version ?? 0;

    if (current > 0) {
        const idRows = await db.select<{ application_id: number }[]>("PRAGMA application_id");
        if ((idRows[0]?.application_id ?? 0) !== APPLICATION_ID)
            throw new Error(legacyDbMessage());
    }
    if (current > migrations.length)
        throw new Error(newerDbMessage());

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
