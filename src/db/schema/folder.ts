/**
 * Creates the folder table in the database (soft delete through deleted_at, manual order through position).
 * @category Database Schema
 */
export const createFolderTable = `
    CREATE TABLE IF NOT EXISTS folder (
        id INTEGER PRIMARY KEY,
        workspaceID INTEGER,
        folderID INTEGER,
        name TEXT NOT NULL CHECK (LENGTH(name) > 0),
        color TEXT CHECK (LENGTH(color) > 0) DEFAULT NULL,
        creation_date TEXT NOT NULL DEFAULT (DATE('now', 'localtime')),
        creation_time TEXT NOT NULL DEFAULT (strftime('%H:%M', 'now', 'localtime')),
        edit_date TEXT NOT NULL DEFAULT (DATE('now', 'localtime')),
        edit_time TEXT NOT NULL DEFAULT (strftime('%H:%M', 'now', 'localtime')),
        position INTEGER NOT NULL DEFAULT 0,
        deleted_at TEXT DEFAULT NULL,
        FOREIGN KEY(workspaceID) REFERENCES workspace(id) ON DELETE CASCADE,
        FOREIGN KEY(folderID) REFERENCES folder(id) ON DELETE CASCADE
    );
`

/**
 * Indexes of the folder table: the name is unique among the non deleted siblings
 * (a folder in the trash does not block its name), the others serve the hierarchy lookups
 * (SQLite does not index foreign keys automatically).
 * @category Database Schema
 */
export const createFolderIndexes = `
    CREATE UNIQUE INDEX IF NOT EXISTS idx_folder_name ON folder(workspaceID, IFNULL(folderID, 0), name) WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_folder_parent ON folder(folderID);
    CREATE INDEX IF NOT EXISTS idx_folder_workspace_parent ON folder(workspaceID, folderID, position);
`

/**
 * Creates the trigger that updates the edit timestamp of the folder table.
 * It fires only when content columns change, so it never re-triggers itself.
 * @category Database Schema
 */
export const createFolderTrigger = `
    DROP TRIGGER IF EXISTS update_folder_edit_timestamp;

    CREATE TRIGGER update_folder_edit_timestamp
    AFTER UPDATE OF workspaceID, folderID, name, color ON folder
    FOR EACH ROW
    BEGIN
        UPDATE folder
        SET
            edit_date = DATE('now', 'localtime'),
            edit_time = strftime('%H:%M', 'now', 'localtime')
        WHERE id = OLD.id;
    END;
`

/**
 * Migration v4: adds the archive date of a folder (NULL = not archived) and makes the name unique only among the
 * siblings that are neither in the trash nor archived (an archived folder does not block its name).
 * @category Database Schema
 */
export const addFolderArchivedAt: string[] = [
    `ALTER TABLE folder ADD COLUMN archived_at TEXT DEFAULT NULL;`,
    `DROP INDEX IF EXISTS idx_folder_name;`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_folder_name ON folder(workspaceID, IFNULL(folderID, 0), name) WHERE deleted_at IS NULL AND archived_at IS NULL;`,
]
