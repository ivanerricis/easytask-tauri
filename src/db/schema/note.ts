/**
 * Creates the note table in the database.
 * @category Database Schema
 */
export const createNoteTable = `
    CREATE TABLE IF NOT EXISTS note (
        id INTEGER PRIMARY KEY,
        workspace_id INTEGER,
        folder_id INTEGER,
        name TEXT NOT NULL CHECK (LENGTH(name) > 0),
        color TEXT CHECK (LENGTH(color) > 0) DEFAULT NULL,
        creation_date TEXT NOT NULL DEFAULT (DATE('now', 'localtime')),
        creation_time TEXT NOT NULL DEFAULT (strftime('%H:%M', 'now', 'localtime')),
        edit_date TEXT NOT NULL DEFAULT (DATE('now', 'localtime')),
        edit_time TEXT NOT NULL DEFAULT (strftime('%H:%M', 'now', 'localtime')),
        FOREIGN KEY(workspace_id) REFERENCES workspace(id) ON DELETE CASCADE,
        FOREIGN KEY(folder_id) REFERENCES folder(id) ON DELETE CASCADE,
        UNIQUE(name, workspace_id),
        UNIQUE(name, folder_id)
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