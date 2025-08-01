/**
 * Creates the task table in the database.
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
        FOREIGN KEY(sectionID) REFERENCES section(id) ON DELETE CASCADE,
        FOREIGN KEY(taskID) REFERENCES task(id) ON DELETE CASCADE
        UNIQUE(text, sectionID)
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