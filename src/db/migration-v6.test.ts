// @vitest-environment node
/// <reference types="node" />
import { beforeEach, describe, expect, it } from "vitest"
import { DatabaseSync } from "node:sqlite"
import { createTableAudioFile } from "./schema/audio_file"
import { createNoteTable } from "./schema/note"
import { createFolderTable } from "./schema/folder"
import { createSectionGroupTable } from "./schema/section_group"
import { createWorkspaceTable } from "./schema/workspace"
import { migrateToV6 } from "./schema/v6"

// Runs the real v1 audio_file table (with rows) through migration v6 on a real SQLite database
let db: DatabaseSync

const all = (sql: string) => db.prepare(sql).all() as Record<string, unknown>[]

beforeEach(() => {
    db = new DatabaseSync(":memory:")
    db.exec("PRAGMA foreign_keys=ON")
    for (const sql of [createWorkspaceTable, createFolderTable, createNoteTable, createSectionGroupTable, createTableAudioFile])
        db.exec(sql)
    db.exec(`
        INSERT INTO workspace (id, name) VALUES (1, 'WS');
        INSERT INTO note (id, workspaceID, name) VALUES (1, 1, 'N');
    `)
    db.exec(`
        INSERT INTO section_group (id, noteID, position) VALUES (1, 1, 0), (2, 1, 1);
        INSERT INTO audio_file (id, section_groupID, name, path) VALUES
            (1, 1, 'a.mp3', 'C:\\a.mp3'), (2, 2, 'b.mp3', 'C:\\b.mp3'), (3, 1, 'c.mp3', 'C:\\c.mp3');
    `)
    db.exec(migrateToV6)
})

describe("migration v6", () => {
    it("bumps user_version and keeps foreign keys enabled", () => {
        expect(all("PRAGMA user_version")[0].user_version).toBe(6)
        expect(all("PRAGMA foreign_keys")[0].foreign_keys).toBe(1)
    })

    it("adds deleted_at (null) and position, initialized by id inside each group", () => {
        const rows = all("SELECT id, position, deleted_at FROM audio_file ORDER BY id")
        expect(rows).toEqual([
            { id: 1, position: 0, deleted_at: null },
            { id: 2, position: 0, deleted_at: null },
            { id: 3, position: 1, deleted_at: null },
        ])
    })

    it("keeps the data and the foreign keys intact, and the cascade still works", () => {
        expect(all("PRAGMA foreign_key_check")).toEqual([])
        db.exec("DELETE FROM section_group WHERE id = 1")
        expect(all("SELECT id FROM audio_file").map(r => r.id)).toEqual([2])
    })

    it("keeps UNIQUE(name, section_groupID), trashed rows included", () => {
        db.exec("UPDATE audio_file SET deleted_at = datetime('now') WHERE id = 1")
        expect(() => db.exec("INSERT INTO audio_file (section_groupID, name, path) VALUES (1, 'a.mp3', 'x')")).toThrow(/UNIQUE/)
    })
})
