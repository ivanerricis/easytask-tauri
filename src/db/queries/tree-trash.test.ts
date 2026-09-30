// @vitest-environment node
/// <reference types="node" />
import { beforeEach, describe, expect, it, vi } from "vitest"
import { DatabaseSync, type SQLInputValue } from "node:sqlite"
import { initialSchema } from "../schema/initial"

// These tests run the real query SQL against a real SQLite database (schema migrated to v4)
let sqlite: DatabaseSync

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
    return { invoke: createSqliteInvoke(() => sqlite) }
})

import { moveDBTreeItem } from "./tree"
import { emptyDBTrash, formatTrashSummary, getDBTrash, getDBTrashedWorkspaces, purgeDBItem, restoreDBItem } from "./trash"
import { deleteDBItem, renameDBItem } from "./shared_queries"
import { createDBSubFolder, createDBWorkspaceFolder } from "./folder"
import { createDBNoteInFolder, createDBWorkspaceNote, getDBNoteData } from "./note"
import { createDBSubTask } from "./task"
import { getDBWorkspaceData, getDBWorkspaces } from "./workspace"

const rows = (sql: string) => sqlite.prepare(sql).all() as Record<string, unknown>[]
const names = (table: string, where = "1=1") =>
    rows(`SELECT name FROM ${table} WHERE ${where} ORDER BY position`).map(r => r.name)
const one = (sql: string) => Object.values(rows(sql)[0])[0]

beforeEach(() => {
    sqlite = new DatabaseSync(":memory:")
    sqlite.exec("PRAGMA foreign_keys=ON")
    for (const sql of initialSchema) sqlite.exec(sql)
    sqlite.exec(`
        INSERT INTO workspace (id, name) VALUES (1, 'WS'), (2, 'Other');
    `)
})

async function seedTree() {
    // root: A(1), B(2), C(3); A/A1(4); notes: root n1,n2; in A: a1
    await createDBWorkspaceFolder(1, "A")
    await createDBWorkspaceFolder(1, "B")
    await createDBWorkspaceFolder(1, "C")
    await createDBSubFolder(1, 1, "A1")
    await createDBWorkspaceNote(1, "n1")
    await createDBWorkspaceNote(1, "n2")
    await createDBNoteInFolder(1, 1, "a1")
}

describe("creation", () => {
    it("appends folders and notes after their siblings and always sets workspaceID", async () => {
        await seedTree()
        expect(names("folder", "folderID IS NULL")).toEqual(["A", "B", "C"])
        expect(names("note", "folderID IS NULL")).toEqual(["n1", "n2"])
        expect(rows("SELECT position FROM folder WHERE name='C'")[0].position).toBe(2)
        expect(rows("SELECT position FROM folder WHERE name='A1'")[0].position).toBe(0)
        expect(rows("SELECT workspaceID FROM note WHERE name='a1'")[0].workspaceID).toBe(1)
    })

    it("allows a subfolder named like a root folder", async () => {
        await seedTree()
        await createDBSubFolder(1, 2, "A")
        await expect(createDBSubFolder(1, 2, "A")).rejects.toMatchObject({ code: "FOLDER_EXISTS" })
    })

    it("createDBSubTask inherits the sectionID of the parent and the task is loaded", async () => {
        sqlite.exec(`
            INSERT INTO note (id, workspaceID, name) VALUES (1, 1, 'N');
            INSERT INTO section_group (id, noteID, position) VALUES (1, 1, 0);
            INSERT INTO section (id, groupID, title) VALUES (1, 1, 'S');
            INSERT INTO task (id, sectionID, text) VALUES (1, 1, 'T');
        `)
        await createDBSubTask(1, "sub")
        await createDBSubTask(2, "subsub")
        expect(rows("SELECT sectionID FROM task ORDER BY id").map(r => r.sectionID)).toEqual([1, 1, 1])
        const data = await getDBNoteData(1)
        expect(data?.tasks).toHaveLength(3)
    })
})

describe("reading", () => {
    it("excludes soft deleted items and orders by position", async () => {
        await seedTree()
        await deleteDBItem("folder", 2)
        await deleteDBItem("note", 1)
        const data = await getDBWorkspaceData(1)
        expect(data?.folders.map(f => f.name)).toEqual(["A", "A1", "C"])
        expect(data?.notes.map(n => n.name)).toEqual(["a1", "n2"])
    })

    it("filters deleted workspaces and lists them in the trash", async () => {
        await deleteDBItem("workspace", 2)
        expect((await getDBWorkspaces())?.map(w => w.id)).toEqual([1])
        expect((await getDBTrashedWorkspaces()).map(w => w.id)).toEqual([2])
    })

    it("hides deleted sections and tasks from getDBNoteData", async () => {
        sqlite.exec(`
            INSERT INTO note (id, workspaceID, name) VALUES (1, 1, 'N');
            INSERT INTO section_group (id, noteID, position) VALUES (1, 1, 0), (2, 1, 1);
            INSERT INTO section (id, groupID, title) VALUES (1, 1, 'S1'), (2, 1, 'S2'), (3, 2, 'S3');
            INSERT INTO task (id, sectionID, text) VALUES (1, 1, 'T1'), (2, 2, 'T2');
        `)
        await deleteDBItem("section", 2)
        await deleteDBItem("section", 3) // last section of group 2: the group stays, empty
        await deleteDBItem("task", 1)
        const data = await getDBNoteData(1)
        expect(data?.groups.map(g => g.id)).toEqual([1, 2])
        expect(data?.sections.map(s => s.id)).toEqual([1])
        expect(data?.tasks).toEqual([])
        expect(one("SELECT deleted_at IS NULL FROM section_group WHERE id=2")).toBe(1)
        expect(one("SELECT deleted_at IS NOT NULL FROM section WHERE id=3")).toBe(1)
    })
})

describe("moveDBTreeItem", () => {
    it("reorders within the same parent", async () => {
        await seedTree()
        await moveDBTreeItem("folder", 3, null, 0) // C to the top
        expect(names("folder", "folderID IS NULL")).toEqual(["C", "A", "B"])
        await moveDBTreeItem("folder", 3, null, 99) // clamped to the end
        expect(names("folder", "folderID IS NULL")).toEqual(["A", "B", "C"])
    })

    it("moves a note into a folder at an index and renumbers the old siblings", async () => {
        await seedTree()
        await moveDBTreeItem("note", 1, 1, 0) // n1 into A before a1
        expect(names("note", "folderID = 1")).toEqual(["n1", "a1"])
        expect(names("note", "folderID IS NULL")).toEqual(["n2"])
        expect(rows("SELECT position FROM note WHERE name='n2'")[0].position).toBe(0)
    })

    it("moves a folder into another folder and back to the root", async () => {
        await seedTree()
        await moveDBTreeItem("folder", 3, 1, 1) // C into A after A1
        expect(names("folder", "folderID = 1")).toEqual(["A1", "C"])
        expect(names("folder", "folderID IS NULL")).toEqual(["A", "B"])
        await moveDBTreeItem("folder", 3, null, 1)
        expect(names("folder", "folderID IS NULL")).toEqual(["A", "C", "B"])
    })

    it("rejects moving a folder into itself or a descendant", async () => {
        await seedTree()
        await expect(moveDBTreeItem("folder", 1, 1, 0)).rejects.toMatchObject({ code: "FOLDER_MOVE_INVALID" })
        await expect(moveDBTreeItem("folder", 1, 4, 0)).rejects.toMatchObject({ code: "FOLDER_MOVE_INVALID" })
        expect(names("folder", "folderID IS NULL")).toEqual(["A", "B", "C"])
    })

    it("rejects a destination folder of another workspace or deleted", async () => {
        await seedTree()
        sqlite.exec("INSERT INTO folder (id, workspaceID, name) VALUES (50, 2, 'X')")
        await expect(moveDBTreeItem("note", 1, 50, 0)).rejects.toMatchObject({ code: "FOLDER_MOVE_INVALID" })
        await deleteDBItem("folder", 2)
        await expect(moveDBTreeItem("note", 1, 2, 0)).rejects.toMatchObject({ code: "FOLDER_MOVE_INVALID" })
    })

    it("reports a name conflict in the destination and changes nothing", async () => {
        await seedTree()
        await createDBNoteInFolder(1, 2, "n1")
        await expect(moveDBTreeItem("note", 1, 2, 0)).rejects.toEqual({
            code: "NOTE_EXISTS",
            message: "Esiste già un elemento con questo nome nella cartella di destinazione.",
        })
        expect(names("note", "folderID IS NULL")).toEqual(["n1", "n2"])
    })

    it("reports a missing item and an invalid type", async () => {
        await expect(moveDBTreeItem("note", 999, null, 0)).rejects.toMatchObject({ code: "ITEM_NOT_FOUND" })
        await expect(moveDBTreeItem("task" as never, 1, null, 0)).rejects.toMatchObject({ code: "INVALID_ITEM_TYPE" })
    })
})

describe("soft delete, trash and restore", () => {
    async function seedNote() {
        // folder A > folder A1 > note "deep" > group 1 > section S1 (+S2) > task T > subtask sub
        sqlite.exec(`
            INSERT INTO folder (id, workspaceID, folderID, name) VALUES (1, 1, NULL, 'A'), (2, 1, 1, 'A1');
            INSERT INTO note (id, workspaceID, folderID, name) VALUES (1, 1, 2, 'deep');
            INSERT INTO section_group (id, noteID, position) VALUES (1, 1, 0);
            INSERT INTO section (id, groupID, title) VALUES (1, 1, 'S1'), (2, 1, 'S2');
            INSERT INTO task (id, sectionID, taskID, text) VALUES (1, 1, NULL, 'T'), (2, 1, 1, 'sub');
        `)
    }

    it("soft deletes without removing rows", async () => {
        await seedNote()
        await deleteDBItem("folder", 1)
        expect(one("SELECT COUNT(*) FROM folder")).toBe(2)
        expect(one("SELECT deleted_at IS NOT NULL FROM folder WHERE id=1")).toBe(1)
        expect(one("SELECT deleted_at IS NULL FROM note WHERE id=1")).toBe(1)
    })

    it("lists the trash of the workspace with context, newest first", async () => {
        await seedNote()
        sqlite.exec("INSERT INTO folder (id, workspaceID, name) VALUES (9, 2, 'elsewhere'); UPDATE folder SET deleted_at='2030-01-01 00:00:00' WHERE id=9")
        await deleteDBItem("task", 1)
        sqlite.exec("UPDATE task SET deleted_at='2026-01-01 10:00:00' WHERE id=1")
        sqlite.exec("UPDATE folder SET deleted_at='2026-01-02 10:00:00' WHERE id=2")
        sqlite.exec("UPDATE section SET deleted_at='2026-01-03 10:00:00' WHERE id=2")
        const trash = await getDBTrash(1)
        expect(trash.map(t => [t.type, t.id])).toEqual([["section", 2], ["folder", 2], ["task", 1]])
        expect(trash[0]).toMatchObject({ name: "S2", context: "Nota deep" })
        expect(trash[1]).toMatchObject({ name: "A1", context: "A" })
        expect(trash[2]).toMatchObject({ name: "T", context: "Nota deep › Sezione S1" })
    })

    it("names deleted groups by their name, falling back to the section count", async () => {
        await seedNote()
        await renameDBItem("section_group", 1, "Idee")
        sqlite.exec("UPDATE section_group SET deleted_at = datetime('now')")
        expect(await getDBTrash(1)).toEqual([expect.objectContaining({ type: "section_group", name: "Idee", context: "deep" })])
        await renameDBItem("section_group", 1, "")
        expect(await getDBTrash(1)).toEqual([expect.objectContaining({ name: "Gruppo di 2 sezioni" })])
    })

    it("names deleted groups by their section count", async () => {
        await seedNote()
        sqlite.exec("UPDATE section_group SET deleted_at = datetime('now')")
        const trash = await getDBTrash(1)
        expect(trash).toEqual([expect.objectContaining({ type: "section_group", name: "Gruppo di 2 sezioni", context: "deep" })])
    })

    it("summarizes what each trashed item contained, ignoring children deleted separately", async () => {
        await seedNote()
        sqlite.exec(`
            INSERT INTO folder (id, workspaceID, folderID, name) VALUES (3, 1, 1, 'A2');
            INSERT INTO note (id, workspaceID, folderID, name) VALUES (2, 1, 1, 'top');
            INSERT INTO section_group (id, noteID, position) VALUES (2, 1, 1);
            INSERT INTO task (id, sectionID, taskID, text) VALUES (3, 1, 2, 'subsub'), (4, 2, NULL, 'T2');
            INSERT INTO audio_file (section_groupID, name, path) VALUES (1, 'a.mp3', '/a.mp3');
        `)
        // subsub was deleted earlier: it does not come back with anything above it
        sqlite.exec("UPDATE task SET deleted_at='2026-01-01 00:00:00' WHERE id=3")
        const summaryOf = async (type: "folder" | "note" | "section_group" | "section" | "task", id: number) => {
            await deleteDBItem(type, id)
            const item = (await getDBTrash(1)).find(t => t.type === type && t.id === id)
            sqlite.exec(`UPDATE ${type} SET deleted_at = NULL WHERE id = ${id}`)
            return item?.summary
        }
        expect(await summaryOf("folder", 1)).toBe("2 sottocartelle · 2 note")
        expect(await summaryOf("note", 1)).toBe("2 gruppi · 2 sezioni · 3 task")
        expect(await summaryOf("section_group", 1)).toBe("2 sezioni · 3 task · 1 audio")
        expect(await summaryOf("section_group", 2)).toBe("Vuoto")
        expect(await summaryOf("section", 1)).toBe("2 task")
        expect(await summaryOf("task", 1)).toBe("1 sottotask")
        expect((await getDBTrash(1)).find(t => t.type === "task" && t.id === 3)?.summary).toBe("Vuoto")
    })

    it("formats summaries: singular forms, omitted zeros, empty and content-less items", () => {
        expect(formatTrashSummary("workspace", { folders: 1, notes: 0 })).toBe("1 cartella")
        expect(formatTrashSummary("folder", { folders: 1, notes: 1 })).toBe("1 sottocartella · 1 nota")
        expect(formatTrashSummary("task", { tasks: 3 })).toBe("3 sottotask")
        expect(formatTrashSummary("note", {})).toBe("Vuoto")
        expect(formatTrashSummary("audio_file", {})).toBe("")
    })

    it("summarizes trashed templates, audio files and workspaces", async () => {
        const content = { version: 1, groups: [{ sections: [{ tasks: [{ subtasks: [{ subtasks: [] }] }] }, { tasks: [] }] }] }
        sqlite.exec(`
            INSERT INTO note_template (workspaceID, name, content, deleted_at) VALUES (1, 'T', '${JSON.stringify(content)}', datetime('now')), (1, 'Broken', 'not json', datetime('now'));
        `)
        expect((await getDBTrash(1)).map(t => t.summary).sort()).toEqual(["1 gruppo · 2 sezioni · 2 task", "Vuoto"])

        sqlite.exec(`
            INSERT INTO folder (id, workspaceID, folderID, name) VALUES (1, 2, NULL, 'R'), (2, 2, 1, 'S'), (3, 2, 1, 'gone');
            INSERT INTO note (workspaceID, folderID, name) VALUES (2, NULL, 'n'), (2, 2, 'm'), (2, 3, 'hidden');
            UPDATE folder SET deleted_at='2026-01-01 00:00:00' WHERE id=3;
        `)
        await deleteDBItem("workspace", 2)
        expect(await getDBTrashedWorkspaces()).toEqual([expect.objectContaining({ id: 2, summary: "2 cartelle · 2 note" })])
    })

    it("restoring a note restores its deleted folder chain", async () => {
        await seedNote()
        await deleteDBItem("note", 1)
        await deleteDBItem("folder", 2)
        await deleteDBItem("folder", 1)
        await restoreDBItem("note", 1)
        expect(rows("SELECT id FROM folder WHERE deleted_at IS NULL").map(r => r.id)).toEqual([1, 2])
        expect(one("SELECT deleted_at IS NULL FROM note WHERE id=1")).toBe(1)
    })

    it("restoring a task restores the parent tasks, section, group, note and folders", async () => {
        await seedNote()
        sqlite.exec("UPDATE folder SET deleted_at='x'; UPDATE note SET deleted_at='x'; UPDATE section_group SET deleted_at='x'; UPDATE section SET deleted_at='x'; UPDATE task SET deleted_at='x'")
        await restoreDBItem("task", 2)
        expect(rows("SELECT id FROM task WHERE deleted_at IS NULL").map(r => r.id)).toEqual([1, 2])
        expect(rows("SELECT id FROM section WHERE deleted_at IS NULL").map(r => r.id)).toEqual([1])
        expect(one("SELECT COUNT(*) FROM section_group WHERE deleted_at IS NULL")).toBe(1)
        expect(one("SELECT COUNT(*) FROM note WHERE deleted_at IS NULL")).toBe(1)
        expect(one("SELECT COUNT(*) FROM folder WHERE deleted_at IS NULL")).toBe(2)
    })

    it("restoring a section restores its deleted group and note", async () => {
        await seedNote()
        sqlite.exec("UPDATE note SET deleted_at='x'; UPDATE section_group SET deleted_at='x'; UPDATE section SET deleted_at='x' WHERE id=2")
        await restoreDBItem("section", 2)
        expect(one("SELECT COUNT(*) FROM section WHERE deleted_at IS NULL")).toBe(2)
        expect(one("SELECT COUNT(*) FROM section_group WHERE deleted_at IS NULL")).toBe(1)
        expect(one("SELECT COUNT(*) FROM note WHERE deleted_at IS NULL")).toBe(1)
    })

    it("restoring a group and a workspace", async () => {
        await seedNote()
        sqlite.exec("UPDATE note SET deleted_at='x'; UPDATE section_group SET deleted_at='x'; UPDATE workspace SET deleted_at='x' WHERE id=2")
        await restoreDBItem("section_group", 1)
        expect(one("SELECT COUNT(*) FROM note WHERE deleted_at IS NULL")).toBe(1)
        await restoreDBItem("workspace", 2)
        expect(await getDBTrashedWorkspaces()).toEqual([])
    })

    it("reports a name conflict on restore", async () => {
        await createDBWorkspaceNote(1, "same")
        await deleteDBItem("note", 1)
        await createDBWorkspaceNote(1, "same")
        await expect(restoreDBItem("note", 1)).rejects.toEqual({
            code: "NOTE_EXISTS",
            message: "Esiste già un elemento con questo nome: rinominalo prima di ripristinare.",
        })
        expect(one("SELECT deleted_at IS NOT NULL FROM note WHERE id=1")).toBe(1)
    })

    it("on a name conflict the whole restore is rolled back: ancestors stay in the trash too", async () => {
        await seedNote()
        await deleteDBItem("folder", 1)
        await deleteDBItem("note", 1)
        sqlite.exec("INSERT INTO note (workspaceID, folderID, name) VALUES (1, 2, 'deep')")
        await expect(restoreDBItem("note", 1)).rejects.toMatchObject({ code: "NOTE_EXISTS" })
        expect((await getDBTrash(1)).map(t => t.type)).toEqual(expect.arrayContaining(["folder", "note"]))
        expect(one("SELECT deleted_at IS NOT NULL FROM folder WHERE id=1")).toBe(1)
    })

    it("purge deletes only trashed items and cascades to children", async () => {
        await seedNote()
        await purgeDBItem("folder", 1) // not in the trash: untouched
        expect(one("SELECT COUNT(*) FROM folder")).toBe(2)
        await deleteDBItem("folder", 1)
        await purgeDBItem("folder", 1)
        expect(one("SELECT COUNT(*) FROM folder")).toBe(0)
        expect(one("SELECT COUNT(*) FROM note")).toBe(0)
        expect(one("SELECT COUNT(*) FROM task")).toBe(0)
    })

    it("purges a workspace through purgeDBItem", async () => {
        await deleteDBItem("workspace", 2)
        await purgeDBItem("workspace", 2)
        expect(one("SELECT COUNT(*) FROM workspace")).toBe(1)
    })

    it("emptyDBTrash removes every trashed item of the workspace only", async () => {
        await seedNote()
        sqlite.exec(`
            INSERT INTO note (id, workspaceID, name) VALUES (2, 1, 'root'), (3, 2, 'other ws');
            INSERT INTO section_group (id, noteID, position) VALUES (2, 2, 0), (3, 3, 0);
            INSERT INTO section (id, groupID, title) VALUES (3, 2, 'X'), (4, 3, 'Y');
            INSERT INTO task (id, sectionID, text) VALUES (3, 3, 'tx'), (4, 4, 'ty');
        `)
        await deleteDBItem("folder", 2)
        await deleteDBItem("note", 2)
        await deleteDBItem("task", 3)
        await deleteDBItem("note", 3)
        await deleteDBItem("section", 2)
        await emptyDBTrash(1)
        expect(rows("SELECT id FROM folder").map(r => r.id)).toEqual([1])
        expect(rows("SELECT id FROM note").map(r => r.id)).toEqual([3]) // deep was in the deleted folder, root deleted
        expect(rows("SELECT id FROM task").map(r => r.id)).toEqual([4]) // children cascaded with their note
    })
})
