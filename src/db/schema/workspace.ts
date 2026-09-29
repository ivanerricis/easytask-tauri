/**
 * Creates the workspace table in the database.
 * @category Database Schema
 */
export const createWorkspaceTable = `
  CREATE TABLE IF NOT EXISTS workspace (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE CHECK (LENGTH(name) > 0),
    color TEXT CHECK (LENGTH(color) > 0) DEFAULT NULL,
    creation_date TEXT NOT NULL DEFAULT (DATE('now', 'localtime')),
    creation_time TEXT NOT NULL DEFAULT (strftime('%H:%M', 'now', 'localtime')),
    edit_date TEXT NOT NULL DEFAULT (DATE('now', 'localtime')),
    edit_time TEXT NOT NULL DEFAULT (strftime('%H:%M', 'now', 'localtime'))
  );
`

/**
 * Recreates the trigger that updates the edit timestamp of the workspace table.
 * It fires only when content columns change, so it never re-triggers itself.
 * @category Database Schema
 */
export const createWorkspaceTrigger = `
    DROP TRIGGER IF EXISTS update_workspace_edit_timestamp;

    CREATE TRIGGER update_workspace_edit_timestamp
    AFTER UPDATE OF name, color ON workspace
    FOR EACH ROW
    BEGIN
        UPDATE workspace
        SET
            edit_date = DATE('now', 'localtime'),
            edit_time = strftime('%H:%M', 'now', 'localtime')
        WHERE id = OLD.id;
    END;
`
