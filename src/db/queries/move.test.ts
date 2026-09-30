// @vitest-environment node
/// <reference types="node" />
import { beforeEach, describe, expect, it, vi } from "vitest"
import { DatabaseSync, type SQLInputValue } from "node:sqlite"
import { createTableAudioFile } from "../schema/audio_file"
import { createFolderTable, createFolderTrigger } from "../schema/folder"
import { createNoteTable, createNoteTrigger } from "../schema/note"
import { createSectionTable, createSectionTrigger } from "../schema/section"
import { createSectionGroupTable } from "../schema/section_group"
import { createTaskTable, createTaskTrigger } from "../schema/task"
import { createWorkspaceTable, createWorkspaceTrigger } from "../schema/workspace"
import { migrateToV3 } from "../schema/v3"
import { migrateToV4 } from "../schema/v4"
import { migrateToV6 } from "../schema/v6"
import { migrateToV7 } from "../schema/v7"
import { migrateToV8 } from "../schema/v8"

// These tests run the real query SQL against a real SQLite database (schema migrated to v4)
let sqlite: DatabaseSync
// Substring of a statement that must fail (to check that a multi-statement move is rolled back)
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

// db_transaction runs on the same in-memory database, with real BEGIN/COMMIT/ROLLBACK
vi.mock("@tauri-apps/api/core", async () => {
    const { createSqliteInvoke } = await import("@/test/db-mock")
    return { invoke: createSqliteInvoke(() => sqlite, { shouldFail: sql => failOn !== null && sql.includes(failOn) }) }
})

import { moveDBSection, moveDBSectionToNewGroup, moveDBTask } from "./move"
import { createDBSectionInGroup } from "./section"
import { createDBSubTask, createDBTask } from "./task"
import { getDBNoteData } from "./note"
import { deleteDBItem } from "./shared_queries"
import { restoreDBItem } from "./trash"
import { createDBGroup } from "./group"

const rows = (sql: string) => sqlite.prepare(sql).all() as Record<string, unknown>[]
const sectionsOf = (groupId: number) =>
    rows(`SELECT title FROM section WHERE groupID = ${groupId} AND deleted_at IS NULL ORDER BY position, id`).map(r => r.title)
const topTasks = (sectionId: number) =>
    rows(`SELECT text FROM task WHERE sectionID = ${sectionId} AND taskID IS NULL AND deleted_at IS NULL ORDER BY position, id`).map(r => r.text)
const subTasks = (taskId: number) =>
    rows(`SELECT text FROM task WHERE taskID = ${taskId} AND deleted_at IS NULL ORDER BY position, id`).map(r => r.text)
const groupIds = () =>
    rows("SELECT id FROM section_group WHERE noteID = 1 AND deleted_at IS NULL ORDER BY position, id").map(r => r.id)
const positions = (sql: string) => rows(sql).map(r => r.position)

beforeEach(() => {
    failOn = null
    sqlite = new DatabaseSync(":memory:")
    sqlite.exec("PRAGMA foreign_keys=ON")
    for (const sql of [
        createWorkspaceTable, createFolderTable, createNoteTable, createSectionGroupTable,
        createSectionTable, createTaskTable, createTableAudioFile,
        createWorkspaceTrigger, createFolderTrigger, createNoteTrigger, createSectionTrigger, createTaskTrigger,
    ]) sqlite.exec(sql)
    sqlite.exec(migrateToV3)
    sqlite.exec(migrateToV4)
    sqlite.exec(migrateToV6)
    sqlite.exec(migrateToV7)
    sqlite.exec(migrateToV8)
    // note 1: group 1 [S1, S2, S3], group 2 [S4], group 3 [S5]; note 2 (other note): group 4 [X]
    sqlite.exec(`
        INSERT INTO workspace (id, name) VALUES (1, 'WS');
        INSERT INTO note (id, workspaceID, name) VALUES (1, 1, 'N'), (2, 1, 'Other');
        INSERT INTO section_group (id, noteID, position) VALUES (1, 1, 0), (2, 1, 1), (3, 1, 2), (4, 2, 0);
    `)
})

async function seedSections() {
    await createDBSectionInGroup(1, "S1")
    await createDBSectionInGroup(1, "S2")
    await createDBSectionInGroup(1, "S3")
    await createDBSectionInGroup(2, "S4")
    await createDBSectionInGroup(3, "S5")
    await createDBSectionInGroup(4, "X")
}

const sectionId = (title: string) => rows(`SELECT id FROM section WHERE title = '${title}'`)[0].id as number

describe("createDBGroup", () => {
    it("appends an empty named group after the visible groups of the note", async () => {
        sqlite.exec("UPDATE section_group SET deleted_at = '2026-01-01' WHERE id = 3")
        await createDBGroup(1, "  Sprint  ")
        const created = rows("SELECT name, position FROM section_group WHERE noteID = 1 AND deleted_at IS NULL ORDER BY position")
        expect(created.at(-1)).toEqual({ name: "Sprint", position: 2 })
        expect(rows("SELECT COUNT(*) AS c FROM section WHERE groupID = (SELECT MAX(id) FROM section_group)")[0].c).toBe(0)
    })

    it("stores a blank name as NULL and starts at 0 in an empty note", async () => {
        sqlite.exec("INSERT INTO note (id, workspaceID, name) VALUES (3, 1, 'Empty')")
        await createDBGroup(3, "   ")
        expect(rows("SELECT name, position FROM section_group WHERE noteID = 3")).toEqual([{ name: null, position: 0 }])
    })
})

describe("creation appends after the siblings", () => {
    it("sections, tasks and subtasks get increasing positions", async () => {
        await seedSections()
        expect(positions("SELECT position FROM section WHERE groupID = 1 ORDER BY id")).toEqual([0, 1, 2])
        const s1 = sectionId("S1")
        await createDBTask(s1, "a")
        await createDBTask(s1, "b")
        const a = rows("SELECT id FROM task WHERE text = 'a'")[0].id as number
        await createDBSubTask(a, "a1")
        await createDBSubTask(a, "a2")
        expect(topTasks(s1)).toEqual(["a", "b"])
        expect(positions("SELECT position FROM task WHERE sectionID IS NOT NULL AND taskID IS NULL ORDER BY id")).toEqual([0, 1])
        expect(subTasks(a)).toEqual(["a1", "a2"])
        expect(positions(`SELECT position FROM task WHERE taskID = ${a} ORDER BY id`)).toEqual([0, 1])
    })

    it("getDBNoteData returns sections and tasks ordered by position", async () => {
        await seedSections()
        sqlite.exec("UPDATE section SET position = 5 WHERE title = 'S1'")
        const data = await getDBNoteData(1)
        expect(data.sections.filter(s => s.groupID === 1).map(s => s.title)).toEqual(["S2", "S3", "S1"])
    })
})

describe("moveDBSection", () => {
    it("reorders inside the same group", async () => {
        await seedSections()
        await moveDBSection(sectionId("S3"), 1, 0)
        expect(sectionsOf(1)).toEqual(["S3", "S1", "S2"])
        await moveDBSection(sectionId("S3"), 1, 99)
        expect(sectionsOf(1)).toEqual(["S1", "S2", "S3"])
        expect(positions("SELECT position FROM section WHERE groupID = 1 ORDER BY position")).toEqual([0, 1, 2])
    })

    it("moves to another group at the given index and renumbers both groups", async () => {
        await seedSections()
        await moveDBSection(sectionId("S2"), 2, 0)
        expect(sectionsOf(1)).toEqual(["S1", "S3"])
        expect(sectionsOf(2)).toEqual(["S2", "S4"])
        expect(positions("SELECT position FROM section WHERE groupID = 1 ORDER BY position")).toEqual([0, 1])
        expect(positions("SELECT position FROM section WHERE groupID = 2 ORDER BY position")).toEqual([0, 1])
    })

    it("keeps the source group, empty, when its last section is moved away", async () => {
        await seedSections()
        await moveDBSection(sectionId("S4"), 1, 1)
        expect(sectionsOf(1)).toEqual(["S1", "S4", "S2", "S3"])
        expect(groupIds()).toEqual([1, 2, 3])
        expect(sectionsOf(2)).toEqual([])
        expect(positions("SELECT position FROM section_group WHERE noteID = 1 ORDER BY position")).toEqual([0, 1, 2])
    })

    it("a trashed section of an emptied group stays restorable into it", async () => {
        await seedSections()
        await createDBSectionInGroup(2, "S4b")
        await deleteDBItem("section", sectionId("S4b"))
        await moveDBSection(sectionId("S4"), 1, 0)
        expect(groupIds()).toEqual([1, 2, 3])
        await restoreDBItem("section", sectionId("S4b"))
        expect(sectionsOf(2)).toEqual(["S4b"])
    })

    it("rejects another note, a deleted group and unknown ids", async () => {
        await seedSections()
        await expect(moveDBSection(sectionId("S1"), 4, 0)).rejects.toMatchObject({ code: "SECTION_MOVE_INVALID" })
        sqlite.exec("UPDATE section_group SET deleted_at = datetime('now') WHERE id = 3")
        await expect(moveDBSection(sectionId("S1"), 3, 0)).rejects.toMatchObject({ code: "SECTION_MOVE_INVALID" })
        await expect(moveDBSection(999, 1, 0)).rejects.toMatchObject({ code: "SECTION_MOVE_INVALID" })
        expect(sectionsOf(1)).toEqual(["S1", "S2", "S3"])
    })

    it("rejects a title clash in the destination group", async () => {
        await seedSections()
        await createDBSectionInGroup(2, "S1")
        await expect(moveDBSection(sectionId("S2"), 2, 0)).resolves.toBeUndefined()
        const firstS1 = rows("SELECT id FROM section WHERE title = 'S1' AND groupID = 1")[0].id as number
        await expect(moveDBSection(firstS1, 2, 0)).rejects.toMatchObject({
            code: "SECTION_EXISTS",
            message: "Esiste già una sezione con questo nome nel gruppo di destinazione.",
        })
        expect(sectionsOf(1)).toContain("S1")
    })

    it("keeps tasks, subtasks and trashed tasks with the moved section", async () => {
        await seedSections()
        const s1 = sectionId("S1")
        await createDBTask(s1, "T")
        await createDBTask(s1, "Trashed")
        const t = rows("SELECT id FROM task WHERE text = 'T'")[0].id as number
        await createDBSubTask(t, "Sub")
        const sub = rows("SELECT id FROM task WHERE text = 'Sub'")[0].id as number
        await createDBSubTask(sub, "SubSub")
        const trashed = rows("SELECT id FROM task WHERE text = 'Trashed'")[0].id as number
        await deleteDBItem("task", trashed)
        await deleteDBItem("task", sub)

        await moveDBSection(s1, 2, 0)

        const rowsAfter = rows("SELECT text, sectionID, deleted_at FROM task ORDER BY id")
        expect(rowsAfter.map(r => r.sectionID)).toEqual([s1, s1, s1, s1])
        expect(rowsAfter.filter(r => r.deleted_at !== null).map(r => r.text)).toEqual(["Trashed", "Sub"])
        const data = await getDBNoteData(1)
        expect(data.sections.find(s => s.id === s1)?.groupID).toBe(2)
        // the trashed subtask hides only itself in the flat data (the tree builder drops its orphan child)
        expect(data.tasks.filter(x => x.sectionID === s1).map(x => x.text)).toEqual(["T", "SubSub"])
        // restoring a trashed task brings it back into the moved section
        await restoreDBItem("task", trashed)
        expect((await getDBNoteData(1)).tasks.filter(x => x.sectionID === s1).map(x => x.text)).toEqual(["T", "SubSub", "Trashed"])
    })
})

describe("moveDBSectionToNewGroup", () => {
    it("creates a new group at the given position, shifting the others", async () => {
        await seedSections()
        await moveDBSectionToNewGroup(sectionId("S2"), 1)
        const ids = groupIds()
        expect(ids).toHaveLength(4)
        expect(ids[0]).toBe(1)
        expect(ids.slice(2)).toEqual([2, 3])
        expect(sectionsOf(ids[1] as number)).toEqual(["S2"])
        expect(sectionsOf(1)).toEqual(["S1", "S3"])
        expect(positions("SELECT position FROM section_group WHERE noteID = 1 ORDER BY position")).toEqual([0, 1, 2, 3])
    })

    it("clamps the position to the end", async () => {
        await seedSections()
        await moveDBSectionToNewGroup(sectionId("S1"), 99)
        const ids = groupIds()
        expect(ids.slice(0, 3)).toEqual([1, 2, 3])
        expect(sectionsOf(ids[3] as number)).toEqual(["S1"])
    })

    it("keeps the source group, empty, when its only section is pulled out", async () => {
        await seedSections()
        await moveDBSectionToNewGroup(sectionId("S4"), 0)
        const ids = groupIds()
        expect(ids).toHaveLength(4)
        expect(sectionsOf(ids[0] as number)).toEqual(["S4"])
        expect(ids.slice(1)).toEqual([1, 2, 3])
        expect(sectionsOf(2)).toEqual([])
        expect(positions("SELECT position FROM section_group WHERE noteID = 1 ORDER BY position")).toEqual([0, 1, 2, 3])
    })

    it("keeps the tasks of the section", async () => {
        await seedSections()
        const s2 = sectionId("S2")
        await createDBTask(s2, "T")
        await moveDBSectionToNewGroup(s2, 0)
        const data = await getDBNoteData(1)
        expect(data.tasks.map(t => t.sectionID)).toEqual([s2])
        expect(data.groups.map(g => g.id)).toContain(data.sections.find(s => s.id === s2)?.groupID)
    })

    it("rejects an unknown section", async () => {
        await expect(moveDBSectionToNewGroup(999, 0)).rejects.toMatchObject({ code: "SECTION_MOVE_INVALID" })
        expect(groupIds()).toEqual([1, 2, 3])
    })
})

describe("moveDBTask", () => {
    let s1: number, s2: number, s4: number
    const id = (text: string) => rows(`SELECT id FROM task WHERE text = '${text}'`)[0].id as number

    beforeEach(async () => {
        await seedSections()
        s1 = sectionId("S1"); s2 = sectionId("S2"); s4 = sectionId("S4")
        for (const text of ["A", "B", "C"]) await createDBTask(s1, text)
        await createDBTask(s2, "D")
        await createDBTask(s4, "E")
        await createDBSubTask(id("A"), "A1")
        await createDBSubTask(id("A"), "A2")
        await createDBSubTask(id("A1"), "A1x")
    })

    it("reorders top level tasks inside the section", async () => {
        await moveDBTask(id("C"), { sectionId: s1, parentTaskId: null }, 0)
        expect(topTasks(s1)).toEqual(["C", "A", "B"])
        await moveDBTask(id("C"), { sectionId: s1, parentTaskId: null }, 2)
        expect(topTasks(s1)).toEqual(["A", "B", "C"])
    })

    it("moves a task to a section of another group and renumbers the source", async () => {
        await moveDBTask(id("A"), { sectionId: s4, parentTaskId: null }, 0)
        expect(topTasks(s4)).toEqual(["A", "E"])
        expect(topTasks(s1)).toEqual(["B", "C"])
        expect(positions(`SELECT position FROM task WHERE sectionID = ${s1} AND taskID IS NULL ORDER BY position`)).toEqual([0, 1])
    })

    it("moves the whole subtree, including trashed descendants, to the new section", async () => {
        await deleteDBItem("task", id("A2"))
        await moveDBTask(id("A"), { sectionId: s4, parentTaskId: null }, 1)
        for (const text of ["A", "A1", "A2", "A1x"])
            expect(rows(`SELECT sectionID FROM task WHERE text = '${text}'`)[0].sectionID).toBe(s4)
        expect(subTasks(id("A"))).toEqual(["A1"])
        expect(subTasks(id("A1"))).toEqual(["A1x"])
        // the trashed descendant is restorable into the new section
        await restoreDBItem("task", id("A2"))
        expect(subTasks(id("A"))).toEqual(["A1", "A2"])
        expect((await getDBNoteData(1)).tasks.filter(t => t.sectionID === s1).map(t => t.text)).toEqual(["B", "C"])
    })

    it("turns a subtask into a top level task of another section", async () => {
        await moveDBTask(id("A1"), { sectionId: s2, parentTaskId: null }, 0)
        expect(topTasks(s2)).toEqual(["A1", "D"])
        expect(subTasks(id("A"))).toEqual(["A2"])
        expect(positions(`SELECT position FROM task WHERE taskID = ${id("A")} ORDER BY position`)).toEqual([0])
        expect(rows("SELECT taskID, sectionID FROM task WHERE text = 'A1'")[0]).toMatchObject({ taskID: null, sectionID: s2 })
        expect(rows("SELECT sectionID FROM task WHERE text = 'A1x'")[0].sectionID).toBe(s2)
    })

    it("moves a task under another task of another section/group and updates its subtree", async () => {
        await moveDBTask(id("A"), { sectionId: s4, parentTaskId: id("E") }, 0)
        expect(subTasks(id("E"))).toEqual(["A"])
        for (const text of ["A", "A1", "A2", "A1x"])
            expect(rows(`SELECT sectionID FROM task WHERE text = '${text}'`)[0].sectionID).toBe(s4)
        expect(topTasks(s1)).toEqual(["B", "C"])
    })

    it("moves a subtask under another task of the same section, reordering siblings", async () => {
        await moveDBTask(id("A1x"), { sectionId: s1, parentTaskId: id("B") }, 0)
        expect(subTasks(id("B"))).toEqual(["A1x"])
        expect(subTasks(id("A1"))).toEqual([])
        await moveDBTask(id("A2"), { sectionId: s1, parentTaskId: id("A") }, 0)
        expect(subTasks(id("A"))).toEqual(["A2", "A1"])
    })

    it("rejects moving a task under itself or one of its descendants", async () => {
        await expect(moveDBTask(id("A"), { sectionId: s1, parentTaskId: id("A") }, 0))
            .rejects.toMatchObject({ code: "TASK_MOVE_INVALID" })
        await expect(moveDBTask(id("A"), { sectionId: s1, parentTaskId: id("A1x") }, 0))
            .rejects.toMatchObject({ code: "TASK_MOVE_INVALID" })
        expect(topTasks(s1)).toEqual(["A", "B", "C"])
    })

    it("rejects a parent outside the target section, other notes, deleted targets and unknown ids", async () => {
        await expect(moveDBTask(id("B"), { sectionId: s2, parentTaskId: id("A") }, 0))
            .rejects.toMatchObject({ code: "TASK_MOVE_INVALID" })
        await expect(moveDBTask(id("B"), { sectionId: sectionId("X"), parentTaskId: null }, 0))
            .rejects.toMatchObject({ code: "TASK_MOVE_INVALID" })
        await deleteDBItem("task", id("D"))
        await expect(moveDBTask(id("B"), { sectionId: s2, parentTaskId: id("D") }, 0))
            .rejects.toMatchObject({ code: "TASK_MOVE_INVALID" })
        await deleteDBItem("section", s2)
        await expect(moveDBTask(id("B"), { sectionId: s2, parentTaskId: null }, 0))
            .rejects.toMatchObject({ code: "TASK_MOVE_INVALID" })
        await expect(moveDBTask(9999, { sectionId: s1, parentTaskId: null }, 0))
            .rejects.toMatchObject({ code: "TASK_MOVE_INVALID" })
        expect(topTasks(s1)).toEqual(["A", "B", "C"])
    })

    it("keeps the invariant: every task has the section of its root task", async () => {
        await moveDBTask(id("A"), { sectionId: s4, parentTaskId: id("E") }, 0)
        await moveDBTask(id("A1"), { sectionId: s2, parentTaskId: id("D") }, 0)
        const all = rows("SELECT id, sectionID, taskID FROM task") as { id: number, sectionID: number, taskID: number | null }[]
        const byId = new Map(all.map(t => [t.id, t]))
        for (const t of all) {
            let root = t
            while (root.taskID != null) root = byId.get(root.taskID)!
            expect(t.sectionID).toBe(root.sectionID)
        }
    })
})

describe("atomicity of the moves", () => {
    const snapshot = () => ({
        groups: rows("SELECT id, position FROM section_group ORDER BY id"),
        sections: rows("SELECT id, groupID, position FROM section ORDER BY id"),
        tasks: rows("SELECT id, sectionID, taskID, position FROM task ORDER BY id"),
    })

    it("moveDBSectionToNewGroup leaves no orphan group when a later statement fails", async () => {
        await seedSections()
        const before = snapshot()
        failOn = "UPDATE section SET groupID = ?, position = 0"
        await expect(moveDBSectionToNewGroup(sectionId("S2"), 1)).rejects.toMatchObject({ code: "SECTION_UNKNOWN_ERROR" })
        failOn = null
        expect(snapshot()).toEqual(before)
    })

    it("moveDBSectionToNewGroup rolls back the new group when the renumbering fails", async () => {
        await seedSections()
        const before = snapshot()
        failOn = "UPDATE section_group SET position"
        await expect(moveDBSectionToNewGroup(sectionId("S2"), 1)).rejects.toMatchObject({ code: "SECTION_UNKNOWN_ERROR" })
        failOn = null
        expect(snapshot()).toEqual(before)
    })

    it("moveDBSection does not renumber the destination when the source renumbering fails", async () => {
        await seedSections()
        const before = snapshot()
        // The destination UPDATE is statement 0, the source renumbering (a positions-only UPDATE) is statement 1
        failOn = "UPDATE section SET position = CASE"
        await expect(moveDBSection(sectionId("S1"), 2, 0)).rejects.toMatchObject({ code: "SECTION_UNKNOWN_ERROR" })
        failOn = null
        expect(snapshot()).toEqual(before)
    })

    it("moveDBTask does not apply the move when the old siblings renumbering fails", async () => {
        await seedSections()
        const s1 = sectionId("S1")
        const s2 = sectionId("S2")
        await createDBTask(s1, "A")
        await createDBTask(s1, "B")
        await createDBTask(s2, "C")
        const before = snapshot()
        failOn = "UPDATE task SET position = CASE"
        await expect(moveDBTask(rows("SELECT id FROM task WHERE text = 'A'")[0].id as number, { sectionId: s2, parentTaskId: null }, 0))
            .rejects.toMatchObject({ code: "TASK_UNKNOWN_ERROR" })
        failOn = null
        expect(snapshot()).toEqual(before)
    })
})
