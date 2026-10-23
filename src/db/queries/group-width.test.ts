// @vitest-environment node
/// <reference types="node" />
import { beforeEach, describe, expect, it, vi } from "vitest"
import { DatabaseSync } from "node:sqlite"
import { sqliteRows } from "@/test/db-mock"
import { latestSchema } from "../schema/initial"

// These tests run the real query SQL against a real SQLite database
let sqlite: DatabaseSync

vi.mock("../dbManager", async () => {
    const { createSqliteDb } = await import("@/test/db-mock")
    return { getDB: vi.fn(async () => createSqliteDb(() => sqlite)) }
})

import { updateDBGroupWidth } from "./group"
import { getDBNoteData } from "./note"

const rows = sqliteRows(() => sqlite)
const widthOf = (id: number) => rows(`SELECT width FROM section_group WHERE id = ${id}`)[0].width

beforeEach(() => {
    sqlite = new DatabaseSync(":memory:")
    sqlite.exec("PRAGMA foreign_keys=ON")
    for (const sql of latestSchema) sqlite.exec(sql)
    sqlite.exec(`
        INSERT INTO workspace (id, name) VALUES (1, 'WS');
        INSERT INTO note (id, workspaceID, name) VALUES (1, 1, 'N');
        INSERT INTO section_group (id, noteID, position) VALUES (1, 1, 0), (2, 1, 1);
    `)
})

describe("updateDBGroupWidth", () => {
    it("sets the width of one group and clears it with null", async () => {
        expect(widthOf(1)).toBeNull()
        await updateDBGroupWidth(1, 420)
        expect(widthOf(1)).toBe(420)
        expect(widthOf(2)).toBeNull()
        await updateDBGroupWidth(1, null)
        expect(widthOf(1)).toBeNull()
    })

    it("is loaded with the note data", async () => {
        await updateDBGroupWidth(2, 500)
        const { groups } = await getDBNoteData(1)
        expect(groups.map(g => g.width ?? null)).toEqual([null, 500])
    })

    it("rejects zero and negative widths", async () => {
        await expect(updateDBGroupWidth(1, 0)).rejects.toThrow()
        await expect(updateDBGroupWidth(1, -5)).rejects.toThrow()
        expect(widthOf(1)).toBeNull()
    })
})
