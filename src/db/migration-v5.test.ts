// @vitest-environment node
/// <reference types="node" />
import { beforeEach, describe, expect, it } from "vitest"
import { DatabaseSync } from "node:sqlite"
import { createTableAudioFile } from "./schema/audio_file"
import { createFolderTable, createFolderTrigger } from "./schema/folder"
import { createNoteTable, createNoteTrigger } from "./schema/note"
import { createSectionTable, createSectionTrigger } from "./schema/section"
import { createSectionGroupTable } from "./schema/section_group"
import { createTaskTable, createTaskTrigger } from "./schema/task"
import { createWorkspaceTable, createWorkspaceTrigger } from "./schema/workspace"
import { migrateToV3 } from "./schema/v3"
import { migrateToV4 } from "./schema/v4"
import { migrateToV5 } from "./schema/v5"

// Runs the real migrations (v1 -> v5) against a real SQLite database
let db: DatabaseSync

const all = (sql: string) => db.prepare(sql).all() as Record<string, unknown>[]

/** Query plan of a statement as one string per step. */
const plan = (sql: string, ...params: number[]) =>
    (db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all(...params) as { detail: string }[]).map(row => row.detail)

const EXPECTED_INDEXES = [
    "idx_folder_parent", "idx_folder_workspace_parent", "idx_note_parent", "idx_note_workspace_parent",
    "idx_section_group_note", "idx_section_parent", "idx_task_section", "idx_task_parent", "idx_audio_file_group",
]

beforeEach(() => {
    db = new DatabaseSync(":memory:")
    db.exec("PRAGMA foreign_keys=ON")
    for (const sql of [
        createWorkspaceTable, createFolderTable, createNoteTable, createSectionGroupTable,
        createSectionTable, createTaskTable, createTableAudioFile,
        createWorkspaceTrigger, createFolderTrigger, createNoteTrigger, createSectionTrigger, createTaskTrigger,
    ]) db.exec(sql)
    db.exec(migrateToV3)
    db.exec(migrateToV4)
    db.exec(`
        INSERT INTO workspace (id, name) VALUES (1, 'WS');
        INSERT INTO folder (id, workspaceID, folderID, name) VALUES (1, 1, NULL, 'F1'), (2, 1, 1, 'F2');
        INSERT INTO note (id, workspaceID, folderID, name) VALUES (1, 1, 2, 'N');
        INSERT INTO section_group (id, noteID, position) VALUES (1, 1, 0);
        INSERT INTO section (id, groupID, title) VALUES (1, 1, 'A');
        INSERT INTO task (id, sectionID, taskID, text) VALUES (1, 1, NULL, 'T1'), (2, 1, 1, 'Sub1');
    `)
    db.exec(migrateToV5)
})

describe("migration v5", () => {
    it("bumps user_version and keeps foreign keys enabled", () => {
        expect(all("PRAGMA user_version")[0].user_version).toBe(5)
        expect(all("PRAGMA foreign_keys")[0].foreign_keys).toBe(1)
    })

    it("creates the indexes", () => {
        const names = all("SELECT name FROM sqlite_master WHERE type = 'index'").map(row => row.name)
        for (const name of EXPECTED_INDEXES) expect(names).toContain(name)
    })

    it("is idempotent", () => {
        db.exec(migrateToV5)
        expect(all("PRAGMA user_version")[0].user_version).toBe(5)
    })

    it("keeps the data untouched", () => {
        expect(all("SELECT COUNT(*) AS c FROM task")[0].c).toBe(2)
        expect(all("PRAGMA foreign_key_check")).toEqual([])
    })
})

describe("query plans use the indexes", () => {
    // "SCAN <cte>" is the read of the recursive queue, not of a table
    const noScan = (steps: string[]) =>
        expect(steps.filter(step => step.startsWith("SCAN") && !/^SCAN (ft|anc|s|subtree|folder_tree)$/.test(step))).toEqual([])

    it("folder descendants (recursive CTE)", () => {
        const steps = plan(`WITH RECURSIVE folder_tree AS (
            SELECT id FROM folder WHERE id = ?
            UNION
            SELECT f.id FROM folder f INNER JOIN folder_tree ft ON f.folderID = ft.id
        ) SELECT id FROM folder_tree`, 1)
        noScan(steps)
        expect(steps.join("\n")).toContain("idx_folder_parent")
    })

    it("folder ancestors walk the primary key", () => {
        const steps = plan(`WITH RECURSIVE anc(id, parent) AS (
            SELECT id, folderID FROM folder WHERE id = ?
            UNION
            SELECT f.id, f.folderID FROM folder f INNER JOIN anc ON f.id = anc.parent
        ) SELECT COUNT(*) FROM anc WHERE id = 2`, 2)
        expect(steps.join("\n")).toContain("PRIMARY KEY")
    })

    it("task descendants (recursive CTE)", () => {
        const steps = plan(`WITH RECURSIVE subtree AS (
            SELECT id FROM task WHERE taskID = ?
            UNION
            SELECT t.id FROM task t INNER JOIN subtree s ON t.taskID = s.id
        ) SELECT id FROM subtree`, 1)
        expect(steps.join("\n")).toContain("idx_task_parent")
        expect(steps.join("\n")).not.toMatch(/SCAN t\b/)
    })

    it("workspace folders and notes", () => {
        for (const table of ["folder", "note"]) {
            const steps = plan(`SELECT * FROM ${table} WHERE workspaceID = ? AND deleted_at IS NULL ORDER BY position, name COLLATE NOCASE`, 1)
            noScan(steps)
        }
    })

    it("sibling lookups by parent folder", () => {
        for (const table of ["folder", "note"]) {
            const steps = plan(`SELECT id FROM ${table} WHERE folderID = ? AND deleted_at IS NULL`, 1)
            expect(steps.join("\n")).toContain(`idx_${table}_parent`)
        }
    })

    it("note data (groups, sections, tasks)", () => {
        noScan(plan("SELECT * FROM section_group WHERE noteID = ? AND deleted_at IS NULL ORDER BY position", 1))
        const sections = plan(`SELECT * FROM section WHERE deleted_at IS NULL AND groupID IN (
            SELECT id FROM section_group WHERE noteID = ? AND deleted_at IS NULL) ORDER BY position, id`, 1)
        noScan(sections)
        const tasks = plan(`SELECT * FROM task WHERE deleted_at IS NULL AND sectionID IN (
            SELECT id FROM section WHERE deleted_at IS NULL AND groupID IN (
            SELECT id FROM section_group WHERE noteID = ? AND deleted_at IS NULL)) ORDER BY position, id`, 1)
        noScan(tasks)
    })

    it("top level tasks of a section are read in position order without a sort", () => {
        const steps = plan("SELECT id FROM task WHERE sectionID = ? AND taskID IS NULL AND deleted_at IS NULL ORDER BY position, id", 1)
        expect(steps.join("\n")).toContain("idx_task_section")
    })

    it("cascade lookups on the child foreign keys do not scan", () => {
        for (const [table, column] of [
            ["folder", "folderID"], ["note", "folderID"], ["section_group", "noteID"],
            ["section", "groupID"], ["task", "sectionID"], ["task", "taskID"], ["audio_file", "section_groupID"],
        ]) noScan(plan(`SELECT id FROM ${table} WHERE ${column} = ?`, 1))
    })

    it("trash of a workspace does not scan the note and folder tables", () => {
        noScan(plan("SELECT id FROM folder WHERE workspaceID = ? AND deleted_at IS NOT NULL", 1))
        noScan(plan("SELECT id FROM note WHERE workspaceID = ? AND deleted_at IS NOT NULL", 1))
    })
})

describe("recursive CTEs on corrupted (cyclic) data", () => {
    it("terminate thanks to UNION, descending and ascending", () => {
        db.exec("PRAGMA foreign_keys=OFF")
        db.exec(`
            INSERT INTO folder (id, workspaceID, folderID, name) VALUES (10, 1, 11, 'C1'), (11, 1, 10, 'C2');
            INSERT INTO task (id, sectionID, taskID, text) VALUES (10, 1, 11, 'K1'), (11, 1, 10, 'K2');
        `)

        const descendants = all(`WITH RECURSIVE folder_tree AS (
            SELECT id FROM folder WHERE id = 10
            UNION
            SELECT f.id FROM folder f INNER JOIN folder_tree ft ON f.folderID = ft.id
        ) SELECT id FROM folder_tree ORDER BY id`)
        expect(descendants.map(row => row.id)).toEqual([10, 11])

        const ancestors = all(`WITH RECURSIVE anc(id, parent) AS (
            SELECT id, taskID FROM task WHERE id = 10
            UNION
            SELECT t.id, t.taskID FROM task t INNER JOIN anc ON t.id = anc.parent
        ) SELECT id FROM anc ORDER BY id`)
        expect(ancestors.map(row => row.id)).toEqual([10, 11])
    })
})
