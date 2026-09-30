/**
 * Migration v5: indexes on the foreign key and hierarchy columns.
 * SQLite does not index foreign keys automatically, so without these the descendant recursive CTEs
 * (folder and task trees), the ON DELETE CASCADE of purge/empty trash and the per-note/per-workspace loads
 * scan whole tables. The partial unique indexes of v3 only cover non deleted rows (and are keyed by
 * IFNULL(folderID, 0) or by name), so they cannot serve those lookups.
 * Purely additive and idempotent; run as ONE script (user_version is bumped inside the transaction).
 * @category Database Schema
 */
export const migrateToV5 = `
    BEGIN;

    CREATE INDEX IF NOT EXISTS idx_folder_parent ON folder(folderID);
    CREATE INDEX IF NOT EXISTS idx_folder_workspace_parent ON folder(workspaceID, folderID, position);
    CREATE INDEX IF NOT EXISTS idx_note_parent ON note(folderID);
    CREATE INDEX IF NOT EXISTS idx_note_workspace_parent ON note(workspaceID, folderID, position);
    CREATE INDEX IF NOT EXISTS idx_section_group_note ON section_group(noteID, position);
    CREATE INDEX IF NOT EXISTS idx_section_parent ON section(groupID, position);
    CREATE INDEX IF NOT EXISTS idx_task_section ON task(sectionID, taskID, position);
    CREATE INDEX IF NOT EXISTS idx_task_parent ON task(taskID, position);
    CREATE INDEX IF NOT EXISTS idx_audio_file_group ON audio_file(section_groupID);

    PRAGMA user_version = 5;
    COMMIT;
`
