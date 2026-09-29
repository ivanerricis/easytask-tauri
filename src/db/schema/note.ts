/**
 * Creates the note table in the database.
 * @category Database Schema
 */
export const createNoteTable = `
    CREATE TABLE IF NOT EXISTS note (
        id INTEGER PRIMARY KEY,
        workspaceID INTEGER,
        folderID INTEGER,
        name TEXT NOT NULL CHECK (LENGTH(name) > 0),
        color TEXT CHECK (LENGTH(color) > 0) DEFAULT NULL,
        creation_date TEXT NOT NULL DEFAULT (DATE('now', 'localtime')),
        creation_time TEXT NOT NULL DEFAULT (strftime('%H:%M', 'now', 'localtime')),
        edit_date TEXT NOT NULL DEFAULT (DATE('now', 'localtime')),
        edit_time TEXT NOT NULL DEFAULT (strftime('%H:%M', 'now', 'localtime')),
        FOREIGN KEY(workspaceID) REFERENCES workspace(id) ON DELETE CASCADE,
        FOREIGN KEY(folderID) REFERENCES folder(id) ON DELETE CASCADE,
        UNIQUE(name, workspaceID),
        UNIQUE(name, folderID)
    );
`

/**
 * Recreates the trigger that updates the edit timestamp of the note table.
 * It fires only when content columns change, so it never re-triggers itself.
 * @category Database Schema
 */
export const createNoteTrigger = `
    DROP TRIGGER IF EXISTS update_note_edit_timestamp;

    CREATE TRIGGER update_note_edit_timestamp
    AFTER UPDATE OF workspaceID, folderID, name, color ON note
    FOR EACH ROW
    BEGIN
        UPDATE note
        SET
            edit_date = DATE('now', 'localtime'),
            edit_time = strftime('%H:%M', 'now', 'localtime')
        WHERE id = OLD.id;
    END;
`
