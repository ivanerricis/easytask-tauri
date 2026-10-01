/**
 * Creates the section_group table in the database.
 * `name` is NULL for an unnamed group (the UI then shows "Gruppo N"): the app stores a blank name as NULL.
 * @category Database Schema
 */
export const createSectionGroupTable = `
    CREATE TABLE IF NOT EXISTS section_group (
        id INTEGER PRIMARY KEY,
        noteID INTEGER NOT NULL,
        position INTEGER NOT NULL,
        deleted_at TEXT DEFAULT NULL,
        name TEXT DEFAULT NULL,
        FOREIGN KEY(noteID) REFERENCES note(id) ON DELETE CASCADE
    );
`

/**
 * Indexes of the section_group table.
 * @category Database Schema
 */
export const createSectionGroupIndexes = `
    CREATE INDEX IF NOT EXISTS idx_section_group_note ON section_group(noteID, position);
`

/**
 * Migration v2: adds the (optional) color of a group. NULL means no color.
 * @category Database Schema
 */
export const addGroupColorColumn = `
    ALTER TABLE section_group ADD COLUMN color TEXT CHECK (LENGTH(color) > 0) DEFAULT NULL;
`
