/**
 * Creates the task table in the database (soft delete through deleted_at, manual order through position).
 * @category Database Schema
 */
export const createTaskTable = `
    CREATE TABLE IF NOT EXISTS task (
        id INTEGER PRIMARY KEY,
        sectionID INTEGER,
        taskID INTEGER,
        text TEXT NOT NULL CHECK (LENGTH(text) > 0),
        description TEXT,
        completed BOOLEAN NOT NULL DEFAULT FALSE,
        priority BOOLEAN NOT NULL DEFAULT FALSE,
        archived BOOLEAN NOT NULL DEFAULT FALSE,
        color TEXT CHECK (LENGTH(color) > 0) DEFAULT NULL,
        creation_date TEXT NOT NULL DEFAULT (DATE('now', 'localtime')),
        creation_time TEXT NOT NULL DEFAULT (strftime('%H:%M', 'now', 'localtime')),
        edit_date TEXT NOT NULL DEFAULT (DATE('now', 'localtime')),
        edit_time TEXT NOT NULL DEFAULT (strftime('%H:%M', 'now', 'localtime')),
        deleted_at TEXT DEFAULT NULL,
        position INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY(sectionID) REFERENCES section(id) ON DELETE CASCADE,
        FOREIGN KEY(taskID) REFERENCES task(id) ON DELETE CASCADE
    );
`

/**
 * Indexes of the task table, serving the task tree lookups and the ON DELETE CASCADE.
 * @category Database Schema
 */
export const createTaskIndexes = `
    CREATE INDEX IF NOT EXISTS idx_task_section ON task(sectionID, taskID, position);
    CREATE INDEX IF NOT EXISTS idx_task_parent ON task(taskID, position);
`

/**
 * Creates the trigger that updates the edit timestamp of the task table.
 * It fires only when content columns change (not position or deleted_at), so it never re-triggers itself.
 * @category Database Schema
 */
export const createTaskTrigger = `
    DROP TRIGGER IF EXISTS update_task_edit_timestamp;

    CREATE TRIGGER update_task_edit_timestamp
    AFTER UPDATE OF sectionID, taskID, text, description, completed, priority, archived, color ON task
    FOR EACH ROW
    BEGIN
        UPDATE task
        SET
            edit_date = DATE('now', 'localtime'),
            edit_time = strftime('%H:%M', 'now', 'localtime')
        WHERE id = OLD.id;
    END;
`
