import { documentDir } from "@tauri-apps/api/path";
import { exists, mkdir } from "@tauri-apps/plugin-fs";
import Database from "@tauri-apps/plugin-sql";
import { initDB } from "./initDb";
import { BaseDirectory } from "@tauri-apps/api/path";

let dbInstance: Database | null = null;

async function createDB(): Promise<Database> {
    // Ottiene il percorso della cartella Document
    const documentPath = await documentDir();
    // Aggiunge il percorso relativo della cartella EasyTask
    const folderPath = `${documentPath}/EasyTask/`;
    const filePath = `${folderPath}easytask-3.db`;

    // Controlla se la cartella EasyTask esiste, altrimenti la crea
    if (!(await exists(folderPath, { baseDir: BaseDirectory.Document }))) {
        await mkdir(folderPath, { recursive: true, baseDir: BaseDirectory.Document });
    }

    // Carica il database (verrà creato se non esiste)
    const db = await Database.load(`sqlite:${filePath}`);

    // Verifica se le tabelle esistono già
    const tablesExist = await checkIfTablesExist(db);

    if (!tablesExist) {
        await initDB(db);
    }

    return db;
}

async function checkIfTablesExist(db: Database): Promise<boolean> {
    try {
        const result = await db.select<{ name: string }[]>(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='workspace'"
        );
        return result.length > 0; // ← controlla se la tabella è davvero presente
    } catch (error) {
        return false;
    }
}

export async function getDB(): Promise<Database> {
    if (!dbInstance) {
        dbInstance = await createDB();
    }
    return dbInstance;
}