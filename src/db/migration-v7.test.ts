// @vitest-environment node
/// <reference types="node" />
import { beforeEach, describe, expect, it } from "vitest"
import { DatabaseSync } from "node:sqlite"
import { createNoteTable } from "./schema/note"
import { createFolderTable } from "./schema/folder"
import { createSectionGroupTable } from "./schema/section_group"
import { createWorkspaceTable } from "./schema/workspace"
import { migrateToV7 } from "./schema/v7"

// Runs the real v1 section_group table (with rows) through migration v7 on a real SQLite database
let db: DatabaseSync

const all = (sql: string) => db.prepare(sql).all() as Record<string, unknown>[]

beforeEach(() => {
    db = new DatabaseSync(":memory:")
    db.exec("PRAGMA foreign_keys=ON")
    for (const sql of [createWorkspaceTable, createFolderTable, createNoteTable, createSectionGroupTable])
        db.exec(sql)
    db.exec(`
        INSERT INTO workspace (id, name) VALUES (1, 'WS');
        INSERT INTO note (id, workspaceID, name) VALUES (1, 1, 'N');
        INSERT INTO section_group (id, noteID, position) VALUES (1, 1, 0), (2, 1, 1);
    `)
    db.exec(migrateToV7)
})

describe("migration v7", () => {
    it("bumps user_version and keeps foreign keys enabled", () => {
        expect(all("PRAGMA user_version")[0].user_version).toBe(7)
        expect(all("PRAGMA foreign_keys")[0].foreign_keys).toBe(1)
    })

    it("adds a nullable name, NULL for the existing groups, data intact", () => {
        expect(all("SELECT id, position, name FROM section_group ORDER BY id")).toEqual([
            { id: 1, position: 0, name: null },
            { id: 2, position: 1, name: null },
        ])
        expect(all("PRAGMA foreign_key_check")).toEqual([])
    })

    it("allows equal names on different groups (no uniqueness)", () => {
        db.exec("UPDATE section_group SET name = 'Da fare'")
        expect(all("SELECT name FROM section_group").map(r => r.name)).toEqual(["Da fare", "Da fare"])
    })

    it("keeps the cascade from the note", () => {
        db.exec("DELETE FROM note WHERE id = 1")
        expect(all("SELECT id FROM section_group")).toEqual([])
    })
})
