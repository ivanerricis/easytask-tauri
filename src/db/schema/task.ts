/**
 * Creates the task table in the database.
 * @category Database Schema
 */
export const createTaskTable = `
    CREATE TABLE IF NOT EXISTS task (
        id INTEGER PRIMARY KEY,
        section_id INTEGER,
        task_id INTEGER,
        text TEXT NOT NULL CHECK (LENGTH(text) > 0),
        description TEXT,
        completed BOOLEAN NOT NULL DEFAULT FALSE,
        priority INTEGER NOT NULL DEFAULT 0,
        archived BOOLEAN NOT NULL DEFAULT FALSE,
        color TEXT CHECK (LENGTH(color) > 0),
        creation_date TEXT NOT NULL DEFAULT (DATE('now', 'localtime')),
        creation_time TEXT NOT NULL DEFAULT (strftime('%H:%M', 'now', 'localtime')),
        edit_date TEXT NOT NULL DEFAULT (DATE('now', 'localtime')),
        edit_time TEXT NOT NULL DEFAULT (strftime('%H:%M', 'now', 'localtime')),
        FOREIGN KEY(section_id) REFERENCES section(id) ON DELETE CASCADE,
        FOREIGN KEY(task_id) REFERENCES task(id) ON DELETE CASCADE
        UNIQUE(text, section_id)
    );

    CREATE TRIGGER IF NOT EXISTS update_task_edit_timestamp
    AFTER UPDATE ON task
    FOR EACH ROW
    BEGIN
        UPDATE task
        SET
            edit_date = DATE('now', 'localtime'),
            edit_time = strftime('%H:%M', 'now', 'localtime')
    WHERE id = OLD.id;
    END;
`