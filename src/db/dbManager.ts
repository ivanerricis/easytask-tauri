import { BaseDirectory, join } from "@tauri-apps/api/path";
import { copyFile } from "@tauri-apps/plugin-fs";
import Database from "@tauri-apps/plugin-sql";
import { ensureAppFolder } from "./appPaths";
import { initDB } from "./initDb";

const APP_FOLDER = "EasyTask";
const DB_FILE = "easytask.db";

/**
 * Copies the database file next to itself before the v3 migration rebuilds the tables.
 * The WAL is checkpointed first so the main file contains every committed change.
 * @param db Database instance already opened.
 * @param currentVersion user_version of the database before migrating.
 * @category Database
 */
async function backupBeforeMigration(db: Database, currentVersion: number) {
    if (currentVersion >= 3) return;
    await db.select("PRAGMA wal_checkpoint(TRUNCATE)").catch(() => undefined);
    await copyFile(`${APP_FOLDER}/${DB_FILE}`, `${APP_FOLDER}/easytask.backup-v${currentVersion}.db`, {
        fromPathBaseDir: BaseDirectory.Document,
        toPathBaseDir: BaseDirectory.Document,
    });
}

let dbPromise: Promise<Database> | null = null;

/**
 * Creates the database if it doesn't exist and migrates it to the latest schema.
 * @returns Promise resolving to the Database instance.
 * @category Database
 */
async function createDB(): Promise<Database> {
    const folderPath = await ensureAppFolder();
    const filePath = await join(folderPath, DB_FILE);

    const db = await Database.load(`sqlite:${filePath}`);

    try {
        await initDB(db, { beforeMigrate: (current) => backupBeforeMigration(db, current) });
    } catch (err: unknown) {
        await db.close().catch(() => false);
        throw err;
    }

    return db;
}

/**
 * Gets the database instance, creating it if it doesn't exist.
 * The creation is shared between concurrent callers and retried after a failure.
 * @returns Promise resolving to the Database instance.
 * @category Database
 */
export function getDB(): Promise<Database> {
    if (!dbPromise) {
        dbPromise = createDB().catch((err: unknown) => {
            dbPromise = null;
            throw err;
        });
    }
    return dbPromise;
}
