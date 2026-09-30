/**
 * Migration v4: manual ordering of sections and tasks.
 * Adds `position` to section (ordered among the sections of a group) and to task (ordered among the tasks
 * that share the same section and parent task), initialized from the id order (the previous implicit order).
 *
 * The edit timestamp triggers do not list `position`, so reordering does not touch edit_date/edit_time
 * and they do not need to be recreated. Run as ONE script so the ALTERs and the initialization
 * are applied atomically (user_version is bumped inside the transaction).
 * @category Database Schema
 */
export const migrateToV4 = `
    BEGIN;

    ALTER TABLE section ADD COLUMN position INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE task ADD COLUMN position INTEGER NOT NULL DEFAULT 0;

    UPDATE section SET position = r.rn
    FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY groupID ORDER BY id) - 1 AS rn FROM section
    ) AS r
    WHERE section.id = r.id;

    UPDATE task SET position = r.rn
    FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY sectionID, IFNULL(taskID, 0) ORDER BY id) - 1 AS rn FROM task
    ) AS r
    WHERE task.id = r.id;

    PRAGMA user_version = 4;
    COMMIT;
`
