import { createAudioFileIndexes, createTableAudioFile } from "./audio_file";
import { addFolderArchivedAt, createFolderIndexes, createFolderTable, createFolderTrigger } from "./folder";
import { addNoteArchivedAt, createNoteIndexes, createNoteTable, createNoteTrigger } from "./note";
import { createNoteTemplateIndexes, createNoteTemplateTable, createNoteTemplateTrigger } from "./note_template";
import { addSectionArchivedAt, createSectionIndexes, createSectionTable, createSectionTrigger } from "./section";
import { addGroupArchivedAt, addGroupColorColumn, createSectionGroupIndexes, createSectionGroupTable } from "./section_group";
import { createTaskIndexes, createTaskTable, createTaskTrigger, dropTaskArchivedColumn } from "./task";
import { createWorkspaceEditTriggers } from "./workspace_edit";
import { createWorkspaceIndexes, createWorkspaceTable, createWorkspaceTrigger } from "./workspace";

/**
 * Value stored in PRAGMA application_id by the initial schema ("EASY" in ASCII).
 * It tells the current schema lineage apart from the legacy databases (which have user_version > 0
 * but application_id = 0), because their user_version numbers overlap with the current ones.
 * @category Database Schema
 */
export const APPLICATION_ID = 0x45415359;

/**
 * Statements that create the whole (final) schema on an empty database, in dependency order.
 * Every statement is idempotent (IF NOT EXISTS / DROP TRIGGER IF EXISTS), so a run interrupted
 * halfway can simply be retried.
 * @category Database Schema
 */
export const initialSchema: string[] = [
    createWorkspaceTable,
    createWorkspaceIndexes,
    createFolderTable,
    createFolderIndexes,
    createNoteTable,
    createNoteIndexes,
    createSectionGroupTable,
    createSectionGroupIndexes,
    createSectionTable,
    createSectionIndexes,
    createTaskTable,
    createTaskIndexes,
    createTableAudioFile,
    createAudioFileIndexes,
    createNoteTemplateTable,
    createNoteTemplateIndexes,
    createWorkspaceTrigger,
    createFolderTrigger,
    createNoteTrigger,
    createSectionTrigger,
    createTaskTrigger,
    createNoteTemplateTrigger,
    `PRAGMA application_id = ${APPLICATION_ID}`,
];

/**
 * Migration v4: archive date (`archived_at`) on folders, notes, groups and sections, with the unique names ignoring the
 * archived ones; removes the old unused `archived` flag of sections and tasks.
 * @category Database Schema
 */
export const archiveSchema: string[] = [
    ...addFolderArchivedAt, ...addNoteArchivedAt, ...addGroupArchivedAt, ...addSectionArchivedAt, ...dropTaskArchivedColumn,
]

/**
 * The whole schema at the latest version (initial schema plus every additive migration), as statements.
 * Used by the tests to build a database in one go: the app itself goes through the migrations in initDb.
 * @category Database Schema
 */
export const latestSchema: string[] = [
    ...initialSchema, addGroupColorColumn, ...createWorkspaceEditTriggers, ...archiveSchema,
]
