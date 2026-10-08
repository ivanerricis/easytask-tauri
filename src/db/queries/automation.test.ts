// @vitest-environment node
/// <reference types="node" />
import { beforeEach, describe, expect, it, vi } from "vitest"
import { DatabaseSync, type SQLInputValue } from "node:sqlite"
import { latestSchema } from "../schema/initial"

// These tests run the real query SQL against a real SQLite database (latest schema)
let sqlite: DatabaseSync
// Substring of a statement that must fail (to check that a transaction is rolled back)
let failOn: string | null = null

vi.mock("../dbManager", () => ({
    getDB: vi.fn(async () => ({
        execute: async (sql: string, params: unknown[] = []) => {
            const r = sqlite.prepare(sql).run(...(params as SQLInputValue[]))
            return { rowsAffected: Number(r.changes), lastInsertId: Number(r.lastInsertRowid) }
        },
        select: async (sql: string, params: unknown[] = []) => sqlite.prepare(sql).all(...(params as SQLInputValue[])),
    })),
}))

vi.mock("@tauri-apps/api/core", async () => {
    const { createSqliteInvoke } = await import("@/test/db-mock")
    return { invoke: createSqliteInvoke(() => sqlite, { shouldFail: sql => failOn !== null && sql.includes(failOn) }) }
})

import { buildNoteTree } from "@/contexts/tree-builders"
import { diffTaskStatements, taskChanges } from "@/lib/automations/diff"
import { runAutomations } from "@/lib/automations/engine"
import type { AutomationDraft } from "@/lib/automations/types"
import { layout, taskOf } from "@/test/automation-fixtures"
import {
    applyDBTaskChanges, createDBAutomation, deleteDBAutomation, getDBAutomations, setDBAutomationEnabled, updateDBAutomation,
} from "./automation"
import { getDBNoteData } from "./note"

const rows = (sql: string) => sqlite.prepare(sql).all() as Record<string, unknown>[]

const draft = (overrides: Partial<AutomationDraft> = {}): AutomationDraft => ({
    name: null,
    enabled: true,
    trigger: { type: "task.completed", sectionId: null },
    actions: [{ type: "moveTo", sectionId: 2, at: "bottom" }],
    ...overrides,
})

beforeEach(() => {
    failOn = null
    sqlite = new DatabaseSync(":memory:")
    sqlite.exec("PRAGMA foreign_keys=ON")
    for (const sql of latestSchema) sqlite.exec(sql)
    sqlite.exec(`
        INSERT INTO workspace (id, name) VALUES (1, 'WS');
        INSERT INTO note (id, workspaceID, name) VALUES (1, 1, 'N'), (2, 1, 'Other');
        INSERT INTO section_group (id, noteID, position) VALUES (1, 1, 0), (2, 2, 0);
        INSERT INTO section (id, groupID, title, position) VALUES (1, 1, 'S1', 0), (2, 1, 'S2', 1), (3, 2, 'X', 0);
    `)
})

describe("createDBAutomation / getDBAutomations", () => {
    it("creates rules with increasing positions per note and returns the new id", async () => {
        const a = await createDBAutomation(1, draft({ name: "first" }))
        const b = await createDBAutomation(1, draft({ name: "second" }))
        const other = await createDBAutomation(2, draft())
        expect(b).toBeGreaterThan(a)
        expect(rows("SELECT id, noteID, position FROM automation ORDER BY id")).toEqual([
            { id: a, noteID: 1, position: 0 },
            { id: b, noteID: 1, position: 1 },
            { id: other, noteID: 2, position: 0 },
        ])
    })

    it("reads the rules in order with the JSON parsed and the enabled flag as a boolean", async () => {
        const first = await createDBAutomation(1, draft({
            name: "  Done  ",
            trigger: { type: "task.movedInto", sectionId: 2 },
            actions: [{ type: "setPriority", value: true }, { type: "setColor", color: null }],
        }))
        const second = await createDBAutomation(1, draft({ enabled: false }))
        await createDBAutomation(2, draft())
        expect(await getDBAutomations(1)).toEqual([
            {
                id: first, noteId: 1, name: "Done", enabled: true, position: 0,
                trigger: { type: "task.movedInto", sectionId: 2 },
                actions: [{ type: "setPriority", value: true }, { type: "setColor", color: null }],
            },
            {
                id: second, noteId: 1, name: null, enabled: false, position: 1,
                trigger: { type: "task.completed", sectionId: null },
                actions: [{ type: "moveTo", sectionId: 2, at: "bottom" }],
            },
        ])
    })

    it("orders by position, then id", async () => {
        const a = await createDBAutomation(1, draft())
        const b = await createDBAutomation(1, draft())
        sqlite.exec(`UPDATE automation SET position = 5 WHERE id = ${a}; UPDATE automation SET position = 2 WHERE id = ${b}`)
        expect((await getDBAutomations(1)).map(rule => rule.id)).toEqual([b, a])
    })

    it("returns an empty list for a note without rules", async () => {
        expect(await getDBAutomations(1)).toEqual([])
    })

    it("skips rows with invalid JSON or an invalid shape", async () => {
        const ok = await createDBAutomation(1, draft())
        const insert = sqlite.prepare("INSERT INTO automation (noteID, trigger, actions, position) VALUES (1, ?, ?, ?)")
        insert.run("not json", "[]", 1)
        insert.run('{"type":"task.completed","sectionId":null}', "{oops", 2)
        insert.run('{"type":"task.movedInto","sectionId":null}', "[]", 3)
        insert.run('{"type":"task.completed","sectionId":null}', '[{"type":"explode"}]', 4)
        insert.run('{"type":"task.completed","sectionId":null}', '{"type":"completeSubtasks"}', 5)
        insert.run('{"type":"task.completed","sectionId":null}', '[{"type":"completeSubtasks"}]', 6)
        const rules = await getDBAutomations(1)
        expect(rules.map(rule => rule.position)).toEqual([0, 6])
        expect(rules[0].id).toBe(ok)
    })

    it("stores the enabled column as 0/1", async () => {
        await createDBAutomation(1, draft({ enabled: false }))
        await createDBAutomation(1, draft({ enabled: true }))
        expect(rows("SELECT enabled FROM automation ORDER BY id")).toEqual([{ enabled: 0 }, { enabled: 1 }])
    })

    it("wraps a database failure in a load error", async () => {
        sqlite.exec("DROP TABLE automation")
        await expect(getDBAutomations(1)).rejects.toMatchObject({ code: "AUTOMATION_LOAD_FAILED" })
    })

    it("wraps a database failure in a save error", async () => {
        await expect(createDBAutomation(999, draft())).rejects.toMatchObject({ code: "AUTOMATION_SAVE_FAILED" })
    })
})

describe("updateDBAutomation / setDBAutomationEnabled / deleteDBAutomation", () => {
    it("replaces the content of a rule and keeps its note and position", async () => {
        await createDBAutomation(1, draft())
        const id = await createDBAutomation(1, draft({ name: "old" }))
        await updateDBAutomation(id, draft({
            name: " new ", enabled: false,
            trigger: { type: "subtasks.completed", sectionId: 1 },
            actions: [{ type: "completeSubtasks" }],
        }))
        const rule = (await getDBAutomations(1)).find(r => r.id === id)
        expect(rule).toEqual({
            id, noteId: 1, name: "new", enabled: false, position: 1,
            trigger: { type: "subtasks.completed", sectionId: 1 },
            actions: [{ type: "completeSubtasks" }],
        })
    })

    it("does not touch the other rules", async () => {
        const a = await createDBAutomation(1, draft({ name: "a" }))
        const b = await createDBAutomation(1, draft({ name: "b" }))
        await updateDBAutomation(a, draft({ name: "changed" }))
        expect((await getDBAutomations(1)).map(rule => rule.name)).toEqual(["changed", "b"])
        expect(b).not.toBe(a)
    })

    it("turns a rule on and off", async () => {
        const id = await createDBAutomation(1, draft())
        await setDBAutomationEnabled(id, false)
        expect((await getDBAutomations(1))[0].enabled).toBe(false)
        await setDBAutomationEnabled(id, true)
        expect((await getDBAutomations(1))[0].enabled).toBe(true)
    })

    it("deletes a rule for good", async () => {
        const a = await createDBAutomation(1, draft())
        const b = await createDBAutomation(1, draft())
        await deleteDBAutomation(a)
        expect((await getDBAutomations(1)).map(rule => rule.id)).toEqual([b])
    })

    it("wraps failures in save / delete errors", async () => {
        sqlite.exec("DROP TABLE automation")
        await expect(updateDBAutomation(1, draft())).rejects.toMatchObject({ code: "AUTOMATION_SAVE_FAILED" })
        await expect(setDBAutomationEnabled(1, true)).rejects.toMatchObject({ code: "AUTOMATION_SAVE_FAILED" })
        await expect(deleteDBAutomation(1)).rejects.toMatchObject({ code: "AUTOMATION_DELETE_FAILED" })
    })

    it("removes the rules of a note when the note row is deleted (cascade)", async () => {
        await createDBAutomation(1, draft())
        await createDBAutomation(1, draft())
        const kept = await createDBAutomation(2, draft())
        sqlite.exec("DELETE FROM note WHERE id = 1")
        expect(rows("SELECT id FROM automation")).toEqual([{ id: kept }])
    })
})

describe("applyDBTaskChanges", () => {
    // S1: 100 (completed, subtask 101 > 1011), 102 ; S2: 200
    async function seedTasks() {
        sqlite.exec(`
            INSERT INTO task (id, sectionID, taskID, text, position, completed) VALUES
                (100, 1, NULL, 'a', 0, 1), (102, 1, NULL, 'b', 1, 0), (200, 2, NULL, 'c', 0, 0);
            INSERT INTO task (id, sectionID, taskID, text, position, completed) VALUES
                (101, 1, 100, 'a1', 0, 0), (1011, 1, 101, 'a11', 0, 0);
        `)
    }

    const loadTree = async () => {
        const { groups, sections, tasks } = await getDBNoteData(1)
        return buildNoteTree(groups, sections, tasks)
    }

    it("does nothing for an empty list", async () => {
        await expect(applyDBTaskChanges([])).resolves.toBeUndefined()
    })

    it("applies the statements of a run end to end and the reloaded note matches", async () => {
        await seedTasks()
        const before = await loadTree()
        expect(layout(before)).toEqual({ 1: [100, 102], 2: [200] })

        const rules = [
            {
                id: 1, noteId: 1, name: null, enabled: true, position: 0,
                trigger: { type: "task.completed", sectionId: 1 } as const,
                actions: [{ type: "moveTo", sectionId: 2, at: "top" }, { type: "setColor", color: "#ff0000" }] as const,
            },
            {
                id: 2, noteId: 1, name: null, enabled: true, position: 1,
                trigger: { type: "task.movedInto", sectionId: 2 } as const,
                actions: [{ type: "setPriority", value: true }] as const,
            },
        ].map(rule => ({ ...rule, actions: [...rule.actions] }))

        const { tree: after, applied, touched } = runAutomations(before, rules, { type: "task.completed", taskId: 100 })
        expect(touched).toEqual([100])
        expect(applied.map(rule => rule.id)).toEqual([1, 2])

        await applyDBTaskChanges(diffTaskStatements(before, after))

        // The raw rows: the whole subtree follows the task, the parents are kept
        expect(rows("SELECT id, sectionID, taskID, position, color, priority FROM task WHERE id IN (100, 101, 1011) ORDER BY id")).toEqual([
            { id: 100, sectionID: 2, taskID: null, position: 0, color: "#ff0000", priority: 1 },
            { id: 101, sectionID: 2, taskID: 100, position: 0, color: null, priority: 0 },
            { id: 1011, sectionID: 2, taskID: 101, position: 0, color: null, priority: 0 },
        ])
        expect(rows("SELECT id, position FROM task WHERE sectionID = 1 AND taskID IS NULL ORDER BY position")).toEqual([{ id: 102, position: 0 }])
        expect(rows("SELECT id, position FROM task WHERE sectionID = 2 AND taskID IS NULL ORDER BY position")).toEqual([
            { id: 100, position: 0 }, { id: 200, position: 1 },
        ])

        const reloaded = await loadTree()
        expect(layout(reloaded)).toEqual(layout(after))
        expect(diffTaskStatements(after, reloaded)).toEqual([])
        expect(taskChanges(after, reloaded, [100, 101, 1011, 102, 200])).toEqual([])
        expect(taskOf(reloaded, 1011).sectionID).toBe(2)
    })

    it("applies flag changes of subtasks (completeSubtasks)", async () => {
        await seedTasks()
        const before = await loadTree()
        const rule = {
            id: 1, noteId: 1, name: null, enabled: true, position: 0,
            trigger: { type: "task.completed", sectionId: null } as const,
            actions: [{ type: "completeSubtasks" } as const],
        }
        const { tree: after } = runAutomations(before, [rule], { type: "task.completed", taskId: 100 })
        const statements = diffTaskStatements(before, after)
        expect(statements).toHaveLength(2)
        await applyDBTaskChanges(statements)
        expect(rows("SELECT id, completed FROM task ORDER BY id")).toEqual([
            { id: 100, completed: 1 }, { id: 101, completed: 1 }, { id: 102, completed: 0 }, { id: 200, completed: 0 }, { id: 1011, completed: 1 },
        ])
    })

    it("applies a reorder inside a section", async () => {
        await seedTasks()
        const before = await loadTree()
        const rule = {
            id: 1, noteId: 1, name: null, enabled: true, position: 0,
            trigger: { type: "task.completed", sectionId: null } as const,
            actions: [{ type: "moveTo", sectionId: 1, at: "bottom" } as const],
        }
        const { tree: after } = runAutomations(before, [rule], { type: "task.completed", taskId: 100 })
        await applyDBTaskChanges(diffTaskStatements(before, after))
        expect(layout(await loadTree())).toEqual({ 1: [102, 100], 2: [200] })
    })

    it("rolls everything back and throws a save error when a statement fails", async () => {
        await seedTasks()
        const before = await loadTree()
        const rule = {
            id: 1, noteId: 1, name: null, enabled: true, position: 0,
            trigger: { type: "task.completed", sectionId: null } as const,
            actions: [{ type: "moveTo", sectionId: 2, at: "top" } as const, { type: "setPriority", value: true } as const],
        }
        const { tree: after } = runAutomations(before, [{ ...rule, actions: [...rule.actions] }], { type: "task.completed", taskId: 100 })
        failOn = "priority = ?"
        await expect(applyDBTaskChanges(diffTaskStatements(before, after))).rejects.toMatchObject({ code: "AUTOMATION_SAVE_FAILED" })
        expect(layout(await loadTree())).toEqual({ 1: [100, 102], 2: [200] })
        expect(rows("SELECT priority FROM task WHERE id = 100")).toEqual([{ priority: 0 }])
    })
})
