/**
 * Migration v8: note templates.
 * `note_template` stores an independent snapshot of a note (versioned JSON in `content`, see NoteTemplateContent)
 * per workspace. `sourceNoteID` is only a hint to refresh the snapshot: it becomes NULL when the note is
 * permanently deleted (the note itself may also be in the trash, the snapshot never changes on its own).
 * Names are unique per workspace among the non deleted templates (a trashed template does not block its name).
 * Run as ONE script (user_version is bumped inside the transaction).
 * @category Database Schema
 */
export const migrateToV8 = `
    BEGIN;

    CREATE TABLE note_template (
        id INTEGER PRIMARY KEY,
        workspaceID INTEGER NOT NULL,
        sourceNoteID INTEGER DEFAULT NULL,
        name TEXT NOT NULL CHECK (LENGTH(name) > 0),
        color TEXT DEFAULT NULL,
        content TEXT NOT NULL,
        creation_date TEXT NOT NULL DEFAULT (DATE('now', 'localtime')),
        creation_time TEXT NOT NULL DEFAULT (strftime('%H:%M', 'now', 'localtime')),
        edit_date TEXT NOT NULL DEFAULT (DATE('now', 'localtime')),
        edit_time TEXT NOT NULL DEFAULT (strftime('%H:%M', 'now', 'localtime')),
        deleted_at TEXT DEFAULT NULL,
        FOREIGN KEY(workspaceID) REFERENCES workspace(id) ON DELETE CASCADE,
        FOREIGN KEY(sourceNoteID) REFERENCES note(id) ON DELETE SET NULL
    );

    CREATE UNIQUE INDEX idx_note_template_name ON note_template(workspaceID, name) WHERE deleted_at IS NULL;
    CREATE INDEX idx_note_template_workspace ON note_template(workspaceID);
    CREATE INDEX idx_note_template_source ON note_template(sourceNoteID);

    CREATE TRIGGER update_note_template_edit_timestamp
    AFTER UPDATE OF name, color, content ON note_template
    FOR EACH ROW
    BEGIN
        UPDATE note_template
        SET
            edit_date = DATE('now', 'localtime'),
            edit_time = strftime('%H:%M', 'now', 'localtime')
        WHERE id = OLD.id;
    END;

    PRAGMA user_version = 8;
    COMMIT;
`
