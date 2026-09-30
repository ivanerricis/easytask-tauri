// @vitest-environment node
/// <reference types="node" />
import { beforeEach, describe, expect, it } from "vitest"
import { DatabaseSync } from "node:sqlite"
import { createNoteTable } from "./schema/note"
import { createFolderTable } from "./schema/folder"
import { createSectionGroupTable } from "./schema/section_group"
import { createSectionTable } from "./schema/section"
import { createTaskTable } from "./schema/task"
import { createTableAudioFile } from "./schema/audio_file"
import { createWorkspaceTable } from "./schema/workspace"
import { migrateToV3 } from "./schema/v3"
import { migrateToV4 } from "./schema/v4"
import { migrateToV6 } from "./schema/v6"
import { migrateToV7 } from "./schema/v7"
import { migrateToV8 } from "./schema/v8"

// Runs migration v8 on a real SQLite database that already has workspaces and notes (schema migrated to v7)
let db: DatabaseSync

const all = (sql: string) => db.prepare(sql).all() as Record<string, unknown>[]

const insertTemplate = (name: string, workspaceID = 1) =>
    db.exec(`INSERT INTO note_template (workspaceID, name, content) VALUES (${workspaceID}, '${name}', '{"version":1,"groups":[]}')`)

beforeEach(() => {
    db = new DatabaseSync(":memory:")
    db.exec("PRAGMA foreign_keys=ON")
    for (const sql of [
        createWorkspaceTable, createFolderTable, createNoteTable, createSectionGroupTable,
        createSectionTable, createTaskTable, createTableAudioFile,
    ]) db.exec(sql)
    for (const sql of [migrateToV3, migrateToV4, migrateToV6, migrateToV7]) db.exec(sql)
    db.exec(`
        INSERT INTO workspace (id, name) VALUES (1, 'WS'), (2, 'Other');
        INSERT INTO note (id, workspaceID, name) VALUES (1, 1, 'N');
    `)
    db.exec(migrateToV8)
})

describe("migration v8", () => {
    it("bumps user_version and keeps foreign keys enabled", () => {
        expect(all("PRAGMA user_version")[0].user_version).toBe(8)
        expect(all("PRAGMA foreign_keys")[0].foreign_keys).toBe(1)
    })

    it("creates the note_template table with defaults and the existing data intact", () => {
        insertTemplate("T")
        const row = all("SELECT * FROM note_template")[0]
        expect(row).toMatchObject({ workspaceID: 1, sourceNoteID: null, name: "T", color: null, deleted_at: null })
        expect(row.creation_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        expect(row.creation_time).toMatch(/^\d{2}:\d{2}$/)
        expect(all("SELECT name FROM note")).toEqual([{ name: "N" }])
        expect(all("PRAGMA foreign_key_check")).toEqual([])
    })

    it("rejects an empty name and a missing content or workspace", () => {
        expect(() => insertTemplate("")).toThrow(/CHECK/)
        expect(() => db.exec("INSERT INTO note_template (workspaceID, name) VALUES (1, 'X')")).toThrow(/NOT NULL/)
        expect(() => insertTemplate("X", 99)).toThrow(/FOREIGN KEY/)
    })

    it("keeps names unique per workspace among the non deleted templates", () => {
        insertTemplate("T")
        expect(() => insertTemplate("T")).toThrow(/UNIQUE/)
        insertTemplate("T", 2)
        db.exec("UPDATE note_template SET deleted_at = datetime('now') WHERE workspaceID = 1")
        insertTemplate("T")
        expect(all("SELECT id FROM note_template WHERE workspaceID = 1")).toHaveLength(2)
    })

    it("sets the source note to NULL when the note is deleted, and cascades from the workspace", () => {
        db.exec(`INSERT INTO note_template (workspaceID, sourceNoteID, name, content) VALUES (1, 1, 'T', '{}')`)
        db.exec("DELETE FROM note WHERE id = 1")
        expect(all("SELECT sourceNoteID FROM note_template")).toEqual([{ sourceNoteID: null }])
        db.exec("DELETE FROM workspace WHERE id = 1")
        expect(all("SELECT id FROM note_template")).toEqual([])
    })

    it("has the indexes", () => {
        const names = all("SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'note_template'").map(r => r.name)
        expect(names).toEqual(expect.arrayContaining(["idx_note_template_name", "idx_note_template_workspace"]))
    })
})
