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

vi.mock("@tauri-apps/api/core", async () => {
    const { createSqliteInvoke } = await import("@/test/db-mock")
    return { invoke: createSqliteInvoke(() => sqlite) }
})

import { setDBCollapsed, setDBGroupCollapsed, setDBSectionCollapsed, setDBTaskCollapsed } from "./collapsed"
import { duplicateDBNote, duplicateDBSection } from "./duplicate"
import { getDBNoteData } from "./note"
import { buildContentFromRows } from "./template"

const rows = sqliteRows(() => sqlite)
const flag = (table: string, id: number) => rows(`SELECT collapsed FROM ${table} WHERE id = ${id}`)[0].collapsed
const wsEdit = () => rows("SELECT edit_date, edit_time FROM workspace WHERE id = 1")[0]

beforeEach(() => {
    sqlite = new DatabaseSync(":memory:")
    sqlite.exec("PRAGMA foreign_keys=ON")
    for (const sql of latestSchema) sqlite.exec(sql)
    sqlite.exec(`
        INSERT INTO workspace (id, name) VALUES (1, 'WS');
        INSERT INTO note (id, workspaceID, name) VALUES (1, 1, 'N');
        INSERT INTO section_group (id, noteID, name, position) VALUES (1, 1, 'G', 0), (2, 1, 'H', 1);
        INSERT INTO section (id, groupID, title, position) VALUES (11, 1, 'S', 1), (12, 1, 'T', 2);
        INSERT INTO task (id, sectionID, text, position) VALUES (1, 11, 'Parent', 0), (2, 11, 'Other', 1);
        INSERT INTO task (id, sectionID, taskID, text, position) VALUES (3, 11, 1, 'Child', 0);
    `)
})

describe("setDBCollapsed", () => {
    it("closes and opens one group, section or task and nothing else", async () => {
        await setDBGroupCollapsed(1, true)
        await setDBSectionCollapsed(11, true)
        await setDBTaskCollapsed(1, true)
        expect([flag("section_group", 1), flag("section_group", 2), flag("section", 11), flag("section", 12), flag("task", 1), flag("task", 2)]).toEqual([1, 0, 1, 0, 1, 0])
        await setDBGroupCollapsed(1, false)
        await setDBSectionCollapsed(11, false)
        await setDBTaskCollapsed(1, false)
        expect([flag("section_group", 1), flag("section", 11), flag("task", 1)]).toEqual([0, 0, 0])
    })

    it("is loaded with the note data (open by default)", async () => {
        await setDBGroupCollapsed(2, true)
        await setDBSectionCollapsed(12, true)
        await setDBTaskCollapsed(2, true)
        const { groups, sections, tasks } = await getDBNoteData(1)
        expect(groups.map(g => Boolean(g.collapsed))).toEqual([false, true])
        expect(sections.filter(s => !s.is_default).map(s => Boolean(s.collapsed))).toEqual([false, true])
        expect(tasks.filter(t => t.collapsed).map(t => t.id)).toEqual([2])
    })

    it("leaves the edit dates of the element and of the workspace alone", async () => {
        sqlite.exec(`
            UPDATE task SET edit_date = '2000-01-01', edit_time = '00:00';
            UPDATE section SET edit_date = '2000-01-01', edit_time = '00:00';
            UPDATE workspace SET edit_date = '2000-01-01', edit_time = '00:00'`)
        await setDBGroupCollapsed(1, true)
        await setDBSectionCollapsed(11, true)
        await setDBTaskCollapsed(1, true)
        expect(wsEdit()).toEqual({ edit_date: "2000-01-01", edit_time: "00:00" })
        expect(rows("SELECT edit_date FROM section WHERE id = 11")[0].edit_date).toBe("2000-01-01")
        expect(rows("SELECT edit_date FROM task WHERE id = 1")[0].edit_date).toBe("2000-01-01")
    })

    it("rejects an unknown kind and wraps a failure", async () => {
        await expect(setDBCollapsed("note" as never, 1, true)).rejects.toThrow()
        sqlite.close()
        await expect(setDBGroupCollapsed(1, true)).rejects.toThrow()
    })
})

describe("the open/closed state is not carried by copies", () => {
    beforeEach(() => {
        sqlite.exec("UPDATE section_group SET collapsed = 1; UPDATE section SET collapsed = 1; UPDATE task SET collapsed = 1")
    })

    it("a duplicated note is open everywhere", async () => {
        const copy = await duplicateDBNote(1)
        const { groups, sections, tasks } = await getDBNoteData(copy)
        expect(groups.length).toBe(2)
        expect(tasks.length).toBe(3)
        expect([...groups, ...sections, ...tasks].every(row => !row.collapsed)).toBe(true)
    })

    it("a duplicated section and its tasks are open", async () => {
        const copy = await duplicateDBSection(11)
        expect(flag("section", copy)).toBe(0)
        expect(rows(`SELECT collapsed FROM task WHERE sectionID = ${copy}`).map(r => r.collapsed)).toEqual([0, 0, 0])
        // the original keeps its state
        expect(flag("section", 11)).toBe(1)
    })

    it("a template (and an export, which uses the same content) does not carry it", async () => {
        const content = buildContentFromRows(await getDBNoteData(1)).content
        expect(JSON.stringify(content)).not.toMatch(/collapsed/i)
    })
})
