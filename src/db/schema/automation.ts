/**
 * Creates the automation table: the rules of a note ("when a task is completed in Doing, move it to Done").
 * `trigger` and `actions` are JSON (see src/lib/automations/types.ts); a rule never leaves its note.
 * A rule is removed with its note (ON DELETE CASCADE, when the note is purged) and deleted for good on its own.
 * @category Database Schema
 */
export const createAutomationTable = `
    CREATE TABLE IF NOT EXISTS automation (
        id INTEGER PRIMARY KEY,
        noteID INTEGER NOT NULL,
        name TEXT DEFAULT NULL,
        enabled BOOLEAN NOT NULL DEFAULT TRUE,
        trigger TEXT NOT NULL,
        actions TEXT NOT NULL,
        position INTEGER NOT NULL DEFAULT 0,
        creation_date TEXT NOT NULL DEFAULT (DATE('now', 'localtime')),
        creation_time TEXT NOT NULL DEFAULT (strftime('%H:%M', 'now', 'localtime')),
        FOREIGN KEY(noteID) REFERENCES note(id) ON DELETE CASCADE
    );
`

/**
 * Indexes of the automation table.
 * @category Database Schema
 */
export const createAutomationIndexes = `
    CREATE INDEX IF NOT EXISTS idx_automation_note ON automation(noteID, position);
`

/**
 * Migration v5: the automations of the notes.
 * @category Database Schema
 */
export const automationSchema: string[] = [createAutomationTable, createAutomationIndexes]
