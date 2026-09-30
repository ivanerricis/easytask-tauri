/**
 * Migration v6: soft delete and manual ordering of the audio files attached to a group.
 * Adds `deleted_at` (trash, like every other table) and `position` (ordered among the files of a group),
 * initialized from the id order.
 *
 * The UNIQUE(name, section_groupID) table constraint of v1 cannot be replaced by a partial unique index
 * without rebuilding the table, so it stays: it also covers the trashed rows, hence a file can always be
 * restored without name conflicts, and the insert query generates a unique name ("song (2).mp3") when the
 * same file name is added twice to a group.
 * Run as ONE script (user_version is bumped inside the transaction).
 * @category Database Schema
 */
export const migrateToV6 = `
    BEGIN;

    ALTER TABLE audio_file ADD COLUMN deleted_at TEXT DEFAULT NULL;
    ALTER TABLE audio_file ADD COLUMN position INTEGER NOT NULL DEFAULT 0;

    UPDATE audio_file SET position = r.rn
    FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY section_groupID ORDER BY id) - 1 AS rn FROM audio_file
    ) AS r
    WHERE audio_file.id = r.id;

    PRAGMA user_version = 6;
    COMMIT;
`
