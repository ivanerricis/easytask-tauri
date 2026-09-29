/**
 * Creates the section table in the database.
 * @category Database Schema
 */
export const createSectionTable = `
    CREATE TABLE IF NOT EXISTS section (
        id INTEGER PRIMARY KEY,
        groupID INTEGER NOT NULL,
        title TEXT NOT NULL CHECK (LENGTH(title) > 0),
        color TEXT CHECK (LENGTH(color) > 0) DEFAULT NULL,
        archived BOOLEAN NOT NULL DEFAULT FALSE,
        creation_date TEXT NOT NULL DEFAULT (DATE('now', 'localtime')),
        creation_time TEXT NOT NULL DEFAULT (strftime('%H:%M', 'now', 'localtime')),
        edit_date TEXT NOT NULL DEFAULT (DATE('now', 'localtime')),
        edit_time TEXT NOT NULL DEFAULT (strftime('%H:%M', 'now', 'localtime')),
        FOREIGN KEY(groupID) REFERENCES section_group(id) ON DELETE CASCADE,
        UNIQUE(title, groupID)
    );
`

/**
 * Recreates the trigger that updates the edit timestamp of the section table.
 * It fires only when content columns change, so it never re-triggers itself.
 * @category Database Schema
 */
export const createSectionTrigger = `
    DROP TRIGGER IF EXISTS update_section_edit_timestamp;

    CREATE TRIGGER update_section_edit_timestamp
    AFTER UPDATE OF groupID, title, color, archived ON section
    FOR EACH ROW
    BEGIN
        UPDATE section
        SET
            edit_date = DATE('now', 'localtime'),
            edit_time = strftime('%H:%M', 'now', 'localtime')
        WHERE id = OLD.id;
    END;
`
