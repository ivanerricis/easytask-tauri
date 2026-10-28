// @vitest-environment node
/// <reference types="node" />
import { beforeEach, describe, expect, it, vi } from "vitest"
import { DatabaseSync } from "node:sqlite"
import { latestSchema } from "../schema/initial"

let sqlite: DatabaseSync

vi.mock("../dbManager", async () => {
    const { createSqliteDb } = await import("@/test/db-mock")
    return { getDB: vi.fn(async () => createSqliteDb(() => sqlite)) }
})

import { noteHasContent } from "./note"

beforeEach(() => {
    sqlite = new DatabaseSync(":memory:")
    sqlite.exec("PRAGMA foreign_keys=ON")
    for (const sql of latestSchema) sqlite.exec(sql)
    sqlite.exec(`
        INSERT INTO workspace (id, name) VALUES (1, 'WS');
        INSERT INTO note (id, workspaceID, name) VALUES (1, 1, 'Empty'), (2, 1, 'Full'), (3, 1, 'Only deleted');
        INSERT INTO section_group (id, noteID, position) VALUES (1, 2, 0), (2, 3, 0);
        UPDATE section_group SET deleted_at = '2026-01-01 00:00:00' WHERE id = 2;
    `)
})

describe("noteHasContent", () => {
    it("is false for a note without groups", async () => {
        expect(await noteHasContent(1)).toBe(false)
    })

    it("is true for a note with a live group", async () => {
        expect(await noteHasContent(2)).toBe(true)
    })

    it("ignores deleted groups", async () => {
        expect(await noteHasContent(3)).toBe(false)
    })

    it("is false for an unknown note", async () => {
        expect(await noteHasContent(99)).toBe(false)
    })
})
