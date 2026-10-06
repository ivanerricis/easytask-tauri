/**
 * Creates the section table in the database (soft delete through deleted_at, manual order through position).
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
        deleted_at TEXT DEFAULT NULL,
        position INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY(groupID) REFERENCES section_group(id) ON DELETE CASCADE
    );
`

/**
 * Indexes of the section table: the title is unique among the non deleted sections of a group.
 * @category Database Schema
 */
export const createSectionIndexes = `
    CREATE UNIQUE INDEX IF NOT EXISTS idx_section_title ON section(groupID, title) WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_section_parent ON section(groupID, position);
`

/**
 * Creates the trigger that updates the edit timestamp of the section table.
 * It fires only when content columns change (not position or deleted_at), so it never re-triggers itself.
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

/**
 * Migration v4: adds the archive date of a section (NULL = not archived), makes the title unique only among the
 * sections of the group that are neither in the trash nor archived, and drops the old unused `archived` flag
 * (the trigger that lists it is dropped first and recreated without it).
 * The DROP COLUMN is retried safely by initDb when a previous run was interrupted after it.
 * @category Database Schema
 */
export const addSectionArchivedAt: string[] = [
    `DROP TRIGGER IF EXISTS update_section_edit_timestamp;`,
    `ALTER TABLE section ADD COLUMN archived_at TEXT DEFAULT NULL;`,
    `ALTER TABLE section DROP COLUMN archived;`,
    `DROP INDEX IF EXISTS idx_section_title;`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_section_title ON section(groupID, title) WHERE deleted_at IS NULL AND archived_at IS NULL;`,
    `
    CREATE TRIGGER IF NOT EXISTS update_section_edit_timestamp
    AFTER UPDATE OF groupID, title, color ON section
    FOR EACH ROW
    BEGIN
        UPDATE section
        SET
            edit_date = DATE('now', 'localtime'),
            edit_time = strftime('%H:%M', 'now', 'localtime')
        WHERE id = OLD.id;
    END;
`,
]
