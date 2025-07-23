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

  CREATE TRIGGER IF NOT EXISTS update_workspace_edit_timestamp
  AFTER UPDATE ON workspace
  FOR EACH ROW
  BEGIN
      UPDATE workspace
      SET
          edit_date = DATE('now', 'localtime'),
          edit_time = strftime('%H:%M', 'now', 'localtime')
  WHERE id = OLD.id;
  END;
`;