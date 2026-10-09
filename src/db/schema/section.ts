import { triggersFor } from "./workspace_edit"

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

const taskTriggers = ["insert", "update", "delete"].map(event => `workspace_edit_on_task_${event}`)

/**
 * Migration v7: the title of a section becomes optional (NULL = no title, like the name of a group; the UI shows a
 * placeholder). SQLite cannot drop NOT NULL / CHECK, so the table is rebuilt, and the whole rebuild is ONE script:
 * - it runs on a single connection (the plugin uses a pool, and PRAGMA foreign_keys is per connection), with the foreign
 *   keys off: dropping the table with them on would delete the tasks through ON DELETE CASCADE;
 * - it is one transaction, so an interruption can never leave the database without its section table (a partial rebuild
 *   rolls back and the migration is simply run again).
 * The workspace triggers of the tasks read the section table and would make the rename fail: they are dropped and created
 * again. The title stays unique among the sections of a group that are neither in the trash nor archived (NULLs never clash).
 * @category Database Schema
 */
export const makeSectionTitleOptional: string[] = [`
    PRAGMA foreign_keys = OFF;
    BEGIN IMMEDIATE;
    ${taskTriggers.map(trigger => `DROP TRIGGER IF EXISTS ${trigger};`).join(" ")}
    DROP TABLE IF EXISTS section_new;
    CREATE TABLE section_new (
        id INTEGER PRIMARY KEY,
        groupID INTEGER NOT NULL,
        title TEXT CHECK (title IS NULL OR LENGTH(title) > 0) DEFAULT NULL,
        color TEXT CHECK (LENGTH(color) > 0) DEFAULT NULL,
        creation_date TEXT NOT NULL DEFAULT (DATE('now', 'localtime')),
        creation_time TEXT NOT NULL DEFAULT (strftime('%H:%M', 'now', 'localtime')),
        edit_date TEXT NOT NULL DEFAULT (DATE('now', 'localtime')),
        edit_time TEXT NOT NULL DEFAULT (strftime('%H:%M', 'now', 'localtime')),
        deleted_at TEXT DEFAULT NULL,
        position INTEGER NOT NULL DEFAULT 0,
        archived_at TEXT DEFAULT NULL,
        FOREIGN KEY(groupID) REFERENCES section_group(id) ON DELETE CASCADE
    );
    INSERT INTO section_new (id, groupID, title, color, creation_date, creation_time, edit_date, edit_time, deleted_at, position, archived_at)
        SELECT id, groupID, title, color, creation_date, creation_time, edit_date, edit_time, deleted_at, position, archived_at FROM section;
    DROP TABLE section;
    ALTER TABLE section_new RENAME TO section;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_section_title ON section(groupID, title) WHERE deleted_at IS NULL AND archived_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_section_parent ON section(groupID, position);
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
    ${[...triggersFor("section"), ...triggersFor("task")].join(" ")}
    COMMIT;
    PRAGMA foreign_keys = ON;
`]
