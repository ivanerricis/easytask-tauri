import { createFolderTrigger } from "./folder";
import { createNoteTrigger } from "./note";
import { createSectionTrigger } from "./section";
import { createTaskTrigger } from "./task";
import { createWorkspaceTrigger } from "./workspace";

/**
 * Migration v3: rebuilds workspace, folder, note, section_group, section and task with the
 * SQLite "12 step" procedure to add soft delete (deleted_at) and manual ordering (position),
 * and to replace the inline UNIQUE constraints with partial unique indexes
 * (a soft deleted item no longer blocks its name).
 *
 * Data fixes applied while copying:
 * - note.workspaceID is always set (backfilled from the parent folder)
 * - task.sectionID is always set (backfilled from the ancestor tasks)
 * - folder/note position follows the case insensitive name order among siblings
 *
 * It must run as ONE statement on ONE pooled connection: PRAGMA foreign_keys is per connection
 * and a DROP TABLE with foreign keys on would cascade to the children. user_version is bumped
 * inside the transaction, so it is rolled back together with the schema on failure.
 * @category Database Schema
 */
export const migrateToV3 = `
    PRAGMA foreign_keys=OFF;
    BEGIN;

    -- workspace
    CREATE TABLE workspace_new (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL CHECK (LENGTH(name) > 0),
        color TEXT CHECK (LENGTH(color) > 0) DEFAULT NULL,
        creation_date TEXT NOT NULL DEFAULT (DATE('now', 'localtime')),
        creation_time TEXT NOT NULL DEFAULT (strftime('%H:%M', 'now', 'localtime')),
        edit_date TEXT NOT NULL DEFAULT (DATE('now', 'localtime')),
        edit_time TEXT NOT NULL DEFAULT (strftime('%H:%M', 'now', 'localtime')),
        deleted_at TEXT DEFAULT NULL
    );
    INSERT INTO workspace_new (id, name, color, creation_date, creation_time, edit_date, edit_time)
        SELECT id, name, color, creation_date, creation_time, edit_date, edit_time FROM workspace;
    DROP TABLE workspace;
    ALTER TABLE workspace_new RENAME TO workspace;
    CREATE UNIQUE INDEX idx_workspace_name ON workspace(name) WHERE deleted_at IS NULL;

    -- folder
    CREATE TABLE folder_new (
        id INTEGER PRIMARY KEY,
        workspaceID INTEGER,
        folderID INTEGER,
        name TEXT NOT NULL CHECK (LENGTH(name) > 0),
        color TEXT CHECK (LENGTH(color) > 0) DEFAULT NULL,
        creation_date TEXT NOT NULL DEFAULT (DATE('now', 'localtime')),
        creation_time TEXT NOT NULL DEFAULT (strftime('%H:%M', 'now', 'localtime')),
        edit_date TEXT NOT NULL DEFAULT (DATE('now', 'localtime')),
        edit_time TEXT NOT NULL DEFAULT (strftime('%H:%M', 'now', 'localtime')),
        position INTEGER NOT NULL DEFAULT 0,
        deleted_at TEXT DEFAULT NULL,
        FOREIGN KEY(workspaceID) REFERENCES workspace(id) ON DELETE CASCADE,
        FOREIGN KEY(folderID) REFERENCES folder(id) ON DELETE CASCADE
    );
    INSERT INTO folder_new (id, workspaceID, folderID, name, color, creation_date, creation_time, edit_date, edit_time, position)
        SELECT id, workspaceID, folderID, name, color, creation_date, creation_time, edit_date, edit_time,
            ROW_NUMBER() OVER (PARTITION BY workspaceID, IFNULL(folderID, 0) ORDER BY name COLLATE NOCASE, id) - 1
        FROM folder;
    DROP TABLE folder;
    ALTER TABLE folder_new RENAME TO folder;
    CREATE UNIQUE INDEX idx_folder_name ON folder(workspaceID, IFNULL(folderID, 0), name) WHERE deleted_at IS NULL;

    -- note
    CREATE TABLE note_new (
        id INTEGER PRIMARY KEY,
        workspaceID INTEGER,
        folderID INTEGER,
        name TEXT NOT NULL CHECK (LENGTH(name) > 0),
        color TEXT CHECK (LENGTH(color) > 0) DEFAULT NULL,
        creation_date TEXT NOT NULL DEFAULT (DATE('now', 'localtime')),
        creation_time TEXT NOT NULL DEFAULT (strftime('%H:%M', 'now', 'localtime')),
        edit_date TEXT NOT NULL DEFAULT (DATE('now', 'localtime')),
        edit_time TEXT NOT NULL DEFAULT (strftime('%H:%M', 'now', 'localtime')),
        position INTEGER NOT NULL DEFAULT 0,
        deleted_at TEXT DEFAULT NULL,
        FOREIGN KEY(workspaceID) REFERENCES workspace(id) ON DELETE CASCADE,
        FOREIGN KEY(folderID) REFERENCES folder(id) ON DELETE CASCADE
    );
    INSERT INTO note_new (id, workspaceID, folderID, name, color, creation_date, creation_time, edit_date, edit_time, position)
        SELECT id, ws, folderID, name, color, creation_date, creation_time, edit_date, edit_time,
            ROW_NUMBER() OVER (PARTITION BY ws, IFNULL(folderID, 0) ORDER BY name COLLATE NOCASE, id) - 1
        FROM (
            SELECT n.*, COALESCE(n.workspaceID, (SELECT f.workspaceID FROM folder f WHERE f.id = n.folderID)) AS ws
            FROM note n
        );
    DROP TABLE note;
    ALTER TABLE note_new RENAME TO note;
    CREATE UNIQUE INDEX idx_note_name ON note(workspaceID, IFNULL(folderID, 0), name) WHERE deleted_at IS NULL;

    -- section_group
    CREATE TABLE section_group_new (
        id INTEGER PRIMARY KEY,
        noteID INTEGER NOT NULL,
        position INTEGER NOT NULL,
        deleted_at TEXT DEFAULT NULL,
        FOREIGN KEY(noteID) REFERENCES note(id) ON DELETE CASCADE
    );
    INSERT INTO section_group_new (id, noteID, position) SELECT id, noteID, position FROM section_group;
    DROP TABLE section_group;
    ALTER TABLE section_group_new RENAME TO section_group;

    -- section
    CREATE TABLE section_new (
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
        FOREIGN KEY(groupID) REFERENCES section_group(id) ON DELETE CASCADE
    );
    INSERT INTO section_new (id, groupID, title, color, archived, creation_date, creation_time, edit_date, edit_time)
        SELECT id, groupID, title, color, archived, creation_date, creation_time, edit_date, edit_time FROM section;
    DROP TABLE section;
    ALTER TABLE section_new RENAME TO section;
    CREATE UNIQUE INDEX idx_section_title ON section(groupID, title) WHERE deleted_at IS NULL;

    -- task
    CREATE TABLE task_new (
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
        FOREIGN KEY(sectionID) REFERENCES section(id) ON DELETE CASCADE,
        FOREIGN KEY(taskID) REFERENCES task(id) ON DELETE CASCADE
    );
    WITH RECURSIVE resolved(id, sec) AS (
        SELECT id, sectionID FROM task WHERE sectionID IS NOT NULL
        UNION ALL
        SELECT t.id, r.sec FROM task t INNER JOIN resolved r ON t.taskID = r.id WHERE t.sectionID IS NULL
    )
    INSERT INTO task_new (id, sectionID, taskID, text, description, completed, priority, archived, color,
                          creation_date, creation_time, edit_date, edit_time)
        SELECT t.id, COALESCE(t.sectionID, r.sec), t.taskID, t.text, t.description, t.completed, t.priority,
               t.archived, t.color, t.creation_date, t.creation_time, t.edit_date, t.edit_time
        FROM task t LEFT JOIN resolved r ON r.id = t.id;
    DROP TABLE task;
    ALTER TABLE task_new RENAME TO task;

    -- triggers are dropped together with the old tables
    ${createWorkspaceTrigger}
    ${createFolderTrigger}
    ${createNoteTrigger}
    ${createSectionTrigger}
    ${createTaskTrigger}

    PRAGMA user_version = 3;
    COMMIT;
    PRAGMA foreign_keys=ON;
`
