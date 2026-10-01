/**
 * Creates the note_template table in the database.
 * It stores an independent snapshot of a note (versioned JSON in `content`, see NoteTemplateContent) per workspace.
 * `sourceNoteID` is only a hint to refresh the snapshot: it becomes NULL when the note is permanently deleted.
 * @category Database Schema
 */
export const createNoteTemplateTable = `
    CREATE TABLE IF NOT EXISTS note_template (
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
`

/**
 * Indexes of the note_template table: names are unique per workspace among the non deleted templates.
 * @category Database Schema
 */
export const createNoteTemplateIndexes = `
    CREATE UNIQUE INDEX IF NOT EXISTS idx_note_template_name ON note_template(workspaceID, name) WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_note_template_workspace ON note_template(workspaceID);
    CREATE INDEX IF NOT EXISTS idx_note_template_source ON note_template(sourceNoteID);
`

/**
 * Creates the trigger that updates the edit timestamp of the note_template table.
 * @category Database Schema
 */
export const createNoteTemplateTrigger = `
    DROP TRIGGER IF EXISTS update_note_template_edit_timestamp;

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
`
