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

    CREATE TRIGGER IF NOT EXISTS update_note_edit_timestamp
    AFTER UPDATE ON note
    FOR EACH ROW
    BEGIN
        UPDATE note
        SET
            edit_date = DATE('now', 'localtime'),
            edit_time = strftime('%H:%M', 'now', 'localtime')
    WHERE id = OLD.id;
    END;
`