/**
 * Migration v7: optional name of a section group.
 * `name` is NULL for an unnamed group (the UI then shows "Gruppo N"). SQLite cannot add a CHECK constraint with
 * ALTER TABLE, so the app normalizes the value instead: an empty or blank name is stored as NULL (see renameDBItem).
 * No uniqueness: several groups may share a name.
 * Run as ONE script (user_version is bumped inside the transaction).
 * @category Database Schema
 */
export const migrateToV7 = `
    BEGIN;

    ALTER TABLE section_group ADD COLUMN name TEXT DEFAULT NULL;

    PRAGMA user_version = 7;
    COMMIT;
`
