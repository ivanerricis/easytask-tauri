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

// Runs the real migration SQL against a real SQLite database
let db: DatabaseSync

const all = (sql: string) => db.prepare(sql).all() as Record<string, unknown>[]
const count = (table: string) => (all(`SELECT COUNT(*) AS c FROM ${table}`)[0].c as number)

beforeEach(() => {
    db = new DatabaseSync(":memory:")
    db.exec("PRAGMA foreign_keys=ON")
    for (const sql of [
        createWorkspaceTable, createFolderTable, createNoteTable, createSectionGroupTable,
        createSectionTable, createTaskTable, createTableAudioFile,
        createWorkspaceTrigger, createFolderTrigger, createNoteTrigger, createSectionTrigger, createTaskTrigger,
    ]) db.exec(sql)
    db.exec("PRAGMA user_version = 2")

    // v2 data: subfolders carry workspaceID, notes in folders do not, subtasks have no sectionID
    db.exec(`
        INSERT INTO workspace (id, name) VALUES (1, 'WS');
        INSERT INTO folder (id, workspaceID, folderID, name) VALUES (1, 1, NULL, 'Work'), (2, 1, NULL, 'docs'), (3, 1, 1, 'Sub');
        INSERT INTO note (id, workspaceID, folderID, name) VALUES
            (1, 1, NULL, 'Root B'), (2, 1, NULL, 'root a'), (3, NULL, 1, 'In Work'), (4, NULL, 3, 'In Sub');
        INSERT INTO section_group (id, noteID, position) VALUES (1, 3, 0);
        INSERT INTO section (id, groupID, title) VALUES (1, 1, 'S1');
        INSERT INTO task (id, sectionID, taskID, text) VALUES (1, 1, NULL, 'T1'), (2, NULL, 1, 'Sub T1'), (3, NULL, 2, 'Sub Sub T1');
        INSERT INTO audio_file (id, section_groupID, name, path) VALUES (1, 1, 'a', 'p');
    `)
    db.exec(migrateToV3)
})

describe("migration v3", () => {
    it("preserves row counts, including children of rebuilt tables", () => {
        expect(count("workspace")).toBe(1)
        expect(count("folder")).toBe(3)
        expect(count("note")).toBe(4)
        expect(count("section_group")).toBe(1)
        expect(count("section")).toBe(1)
        expect(count("task")).toBe(3)
        expect(count("audio_file")).toBe(1)
    })

    it("bumps user_version and leaves foreign keys enabled", () => {
        expect(all("PRAGMA user_version")[0].user_version).toBe(3)
        expect(all("PRAGMA foreign_keys")[0].foreign_keys).toBe(1)
    })

    it("backfills note.workspaceID from the folder chain", () => {
        const rows = all("SELECT id, workspaceID FROM note ORDER BY id")
        expect(rows.map(r => r.workspaceID)).toEqual([1, 1, 1, 1])
    })

    it("backfills task.sectionID from the ancestor tasks", () => {
        const rows = all("SELECT id, sectionID FROM task ORDER BY id")
        expect(rows.map(r => r.sectionID)).toEqual([1, 1, 1])
    })

    it("assigns positions by case insensitive name among siblings", () => {
        expect(all("SELECT name, position FROM folder WHERE folderID IS NULL ORDER BY position"))
            .toEqual([{ name: "docs", position: 0 }, { name: "Work", position: 1 }])
        expect(all("SELECT name, position FROM note WHERE folderID IS NULL ORDER BY position"))
            .toEqual([{ name: "root a", position: 0 }, { name: "Root B", position: 1 }])
        expect(all("SELECT position FROM note WHERE id = 3")[0].position).toBe(0)
    })

    it("adds deleted_at (null) to every rebuilt table", () => {
        for (const table of ["workspace", "folder", "note", "section_group", "section", "task"])
            expect(all(`SELECT deleted_at FROM ${table}`).every(r => r.deleted_at === null)).toBe(true)
    })

    it("has no foreign key violations", () => {
        expect(all("PRAGMA foreign_key_check")).toEqual([])
    })

    it("still cascades deletes through the rebuilt foreign keys", () => {
        db.exec("DELETE FROM folder WHERE id = 1")
        expect(count("folder")).toBe(1)
        expect(count("note")).toBe(2)
        expect(count("section_group")).toBe(0)
        expect(count("task")).toBe(0)
        expect(count("audio_file")).toBe(0)
    })

    it("allows a subfolder with the same name as a root folder, but not twice in the same parent", () => {
        db.exec("INSERT INTO folder (workspaceID, folderID, name) VALUES (1, 1, 'docs')")
        expect(() => db.exec("INSERT INTO folder (workspaceID, folderID, name) VALUES (1, 1, 'docs')")).toThrow(/UNIQUE/)
        expect(() => db.exec("INSERT INTO folder (workspaceID, name) VALUES (1, 'docs')")).toThrow(/UNIQUE/)
    })

    it("allows the same note name in different folders", () => {
        db.exec("INSERT INTO note (workspaceID, folderID, name) VALUES (1, 1, 'Root B')")
        expect(() => db.exec("INSERT INTO note (workspaceID, folderID, name) VALUES (1, NULL, 'Root B')")).toThrow(/UNIQUE/)
    })

    it("partial unique indexes ignore soft deleted rows", () => {
        expect(() => db.exec("INSERT INTO workspace (name) VALUES ('WS')")).toThrow(/UNIQUE/)
        db.exec("UPDATE workspace SET deleted_at = datetime('now') WHERE id = 1")
        db.exec("INSERT INTO workspace (name) VALUES ('WS')")

        expect(() => db.exec("INSERT INTO section (groupID, title) VALUES (1, 'S1')")).toThrow(/UNIQUE/)
        db.exec("UPDATE section SET deleted_at = datetime('now') WHERE id = 1")
        db.exec("INSERT INTO section (groupID, title) VALUES (1, 'S1')")
    })

    it("does not restrict duplicated task text", () => {
        db.exec("INSERT INTO task (sectionID, text) VALUES (1, 'T1')")
        expect(count("task")).toBe(4)
    })

    it("recreates the edit timestamp triggers without position and deleted_at", () => {
        const triggers = all("SELECT name, sql FROM sqlite_master WHERE type = 'trigger' ORDER BY name")
        expect(triggers.map(t => t.name)).toEqual([
            "update_folder_edit_timestamp",
            "update_note_edit_timestamp",
            "update_section_edit_timestamp",
            "update_task_edit_timestamp",
            "update_workspace_edit_timestamp",
        ])
        for (const t of triggers) {
            expect(String(t.sql)).not.toMatch(/position/)
            expect(String(t.sql)).not.toMatch(/deleted_at/)
        }
    })

    it("does not leave the temporary tables around", () => {
        const names = all("SELECT name FROM sqlite_master WHERE type = 'table'").map(r => r.name)
        expect(names.filter(n => String(n).endsWith("_new"))).toEqual([])
    })
})

describe("migration v3 failure", () => {
    it("rolls back everything when the script fails midway", () => {
        const fresh = new DatabaseSync(":memory:")
        for (const sql of [
            createWorkspaceTable, createFolderTable, createNoteTable, createSectionGroupTable,
            createSectionTable, createTaskTable, createTableAudioFile,
        ]) fresh.exec(sql)
        // a leftover table makes the script fail at "CREATE TABLE task_new"
        fresh.exec("CREATE TABLE task_new (id INTEGER)")
        expect(() => fresh.exec(migrateToV3)).toThrow()
        fresh.exec("ROLLBACK")
        const cols = fresh.prepare("PRAGMA table_info(workspace)").all().map(c => (c as { name: string }).name)
        expect(cols).not.toContain("deleted_at")
    })
})
