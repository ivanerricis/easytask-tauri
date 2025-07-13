export const createSectionTable = `
    CREATE TABLE IF NOT EXISTS section (
        id INTEGER PRIMARY KEY,
        group_id INTEGER NOT NULL,
        title TEXT NOT NULL CHECK (LENGTH(title) > 0),
        color TEXT CHECK (LENGTH(color) > 0),
        archived BOOLEAN NOT NULL DEFAULT FALSE,
        creation_date TEXT NOT NULL DEFAULT (DATE('now', 'localtime')),
        creation_time TEXT NOT NULL DEFAULT (strftime('%H:%M', 'now', 'localtime')),
        edit_date TEXT NOT NULL DEFAULT (DATE('now', 'localtime')),
        edit_time TEXT NOT NULL DEFAULT (strftime('%H:%M', 'now', 'localtime')),
        FOREIGN KEY(group_id) REFERENCES section_group(id) ON DELETE CASCADE,
        UNIQUE(title, group_id)
    );

    CREATE TRIGGER IF NOT EXISTS update_section_edit_timestamp
    AFTER UPDATE ON section
    FOR EACH ROW
    BEGIN
        UPDATE section
        SET
            edit_date = DATE('now', 'localtime'),
            edit_time = strftime('%H:%M', 'now', 'localtime')
    WHERE id = OLD.id;
    END;
`