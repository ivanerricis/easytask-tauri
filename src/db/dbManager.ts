import { documentDir } from "@tauri-apps/api/path";
import { exists, mkdir } from "@tauri-apps/plugin-fs";
import Database from "@tauri-apps/plugin-sql";
import { initDB } from "./initDb";
import { BaseDirectory } from "@tauri-apps/api/path";

let dbInstance: Database | null = null;

/**
 * Creates the database if it doesn't exist and initializes it with the schema.
 * @returns Promise resolving to the Database instance.
 * @category Database
 */
async function createDB(): Promise<Database> {
    const documentPath = await documentDir();

    const folderPath = `${documentPath}/EasyTask/`;
    const filePath = `${folderPath}easytask.db`;

    if (!(await exists(folderPath, { baseDir: BaseDirectory.Document }))) {
        await mkdir(folderPath, { recursive: true, baseDir: BaseDirectory.Document });
    }

    const db = await Database.load(`sqlite:${filePath}`);

    const tablesExist = await checkIfTablesExist(db);

    if (!tablesExist) {
        await initDB(db);
    }

    return db;
}

/**
 * Checks if the necessary tables exist in the database.
 * @param db Database instance to check for table existence.
 * @returns Promise resolving to a boolean indicating if the tables exist.
 * @category Database
 */
async function checkIfTablesExist(db: Database): Promise<boolean> {
    try {
        const result = await db.select<{ name: string }[]>(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='workspace'"
        );
        return result.length > 0;
    } catch (error) {
        return false;
    }
}

/**
 * Gets the database instance, creating it if it doesn't exist.
 * @returns Promise resolving to the Database instance.
 * @category Database
 */
export async function getDB(): Promise<Database> {
    if (!dbInstance) {
        dbInstance = await createDB();
    }
    return dbInstance;
}