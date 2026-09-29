import { join } from "@tauri-apps/api/path";
import Database from "@tauri-apps/plugin-sql";
import { ensureAppFolder } from "./appPaths";
import { initDB } from "./initDb";

let dbPromise: Promise<Database> | null = null;

/**
 * Creates the database if it doesn't exist and migrates it to the latest schema.
 * @returns Promise resolving to the Database instance.
 * @category Database
 */
async function createDB(): Promise<Database> {
    const folderPath = await ensureAppFolder();
    const filePath = await join(folderPath, "easytask.db");

    const db = await Database.load(`sqlite:${filePath}`);

    try {
        await initDB(db);
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
