// @vitest-environment node
/// <reference types="node" />
import { beforeEach, describe, expect, it, vi } from "vitest"
import { DatabaseSync, type SQLInputValue } from "node:sqlite"
import { latestSchema } from "../schema/initial"

// These tests run the real query SQL against a real SQLite database
let sqlite: DatabaseSync
// Set to a substring to make the next matching statement fail (simulates a failure in the middle of the copy)
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

import { duplicateDBNote, duplicateDBSection, uniqueCopyName } from "./duplicate"
import { getDBNoteData } from "./note"

const rows = (sql: string) => sqlite.prepare(sql).all() as Record<string, unknown>[]

async function thrown(p: Promise<unknown>): Promise<unknown> {
    try {
        await p
    } catch (e) {
        return e
    }
    throw new Error("expected rejection")
}

// Normalized tree of a note (no ids), to compare a note with its copy
type TreeTask = Record<string, unknown> & { subtasks: TreeTask[] }
async function noteTree(noteId: number) {
    const { groups, sections, tasks } = await getDBNoteData(noteId)
    const taskNode = (t: (typeof tasks)[number]): TreeTask => ({
        text: t.text, description: t.description ?? null, completed: !!t.completed, priority: !!t.priority,
        archived: !!t.archived, color: t.color ?? null, position: t.position,
        subtasks: tasks.filter(c => c.taskID === t.id).map(taskNode),
    })
    return groups.map(g => ({
        name: g.name ?? null, color: g.color ?? null, position: g.position,
        sections: sections.filter(s => s.groupID === g.id).map(s => ({
            title: s.title, color: s.color ?? null, archived: !!s.archived, position: s.position,
            tasks: tasks.filter(t => t.sectionID === s.id && t.taskID === null).map(taskNode),
        })),
    }))
}

const order = (table: "note" | "section", where: string) =>
    rows(`SELECT ${table === "note" ? "name" : "title"} AS label, position FROM ${table} WHERE ${where} AND deleted_at IS NULL ORDER BY position`)
        .map(r => `${r.label}@${r.position}`)

beforeEach(() => {
    failOn = null
    sqlite = new DatabaseSync(":memory:")
    sqlite.exec("PRAGMA foreign_keys=ON")
    for (const sql of latestSchema) sqlite.exec(sql)
    sqlite.exec(`
        INSERT INTO workspace (id, name) VALUES (1, 'WS');
        INSERT INTO folder (id, workspaceID, name) VALUES (1, 1, 'Cartella');
        INSERT INTO note (id, workspaceID, name, color, position) VALUES (1, 1, 'Prima', '#ff0000', 0), (2, 1, 'Seconda', NULL, 1), (3, 1, 'Terza', NULL, 2);
        INSERT INTO note (id, workspaceID, folderID, name, position) VALUES (4, 1, 1, 'Prima', 0);

        INSERT INTO section_group (id, noteID, position, name, color) VALUES (1, 1, 0, 'Sprint', '#abcdef'), (2, 1, 1, NULL, NULL);
        INSERT INTO section (id, groupID, title, color, archived, position) VALUES
            (1, 1, 'Da fare', '#00ff00', 0, 0),
            (2, 1, 'Archivio', NULL, 1, 1),
            (3, 1, 'Ultima', NULL, 0, 2),
            (4, 2, 'Idee', NULL, 0, 0),
            (5, 1, 'Eliminata', NULL, 0, 3);
        INSERT INTO task (id, sectionID, taskID, text, description, completed, priority, archived, color, position) VALUES
            (1, 1, NULL, 'Radice B', 'descrizione', 1, 1, 0, '#0000ff', 1),
            (2, 1, NULL, 'Radice A', NULL, 0, 0, 0, NULL, 0),
            (3, 1, 1, 'Figlio', NULL, 0, 0, 1, '#111111', 0),
            (4, 1, 3, 'Nipote', NULL, 1, 1, 0, NULL, 0),
            (5, 1, NULL, 'Eliminato', NULL, 0, 0, 0, NULL, 2),
            (6, 1, 5, 'Figlio di eliminato', NULL, 0, 0, 0, NULL, 0),
            (7, 4, NULL, 'Idea', NULL, 0, 0, 0, NULL, 0);
        UPDATE task SET deleted_at = datetime('now') WHERE id = 5;
        UPDATE section SET deleted_at = datetime('now') WHERE id = 5;

        INSERT INTO audio_file (name, path, section_groupID) VALUES ('song.mp3', '/x/song.mp3', 1);
    `)
})

describe("uniqueCopyName", () => {
    it("adds the translated suffix and a counter on clashes", () => {
        expect(uniqueCopyName("Nota", new Set())).toBe("Nota (copia)")
        expect(uniqueCopyName("Nota", new Set(["Nota (copia)"]))).toBe("Nota (copia 2)")
        expect(uniqueCopyName("Nota", new Set(["Nota (copia)", "Nota (copia 2)"]))).toBe("Nota (copia 3)")
    })
})

describe("duplicateDBNote", () => {
    it("copies the note with an exact content, the same color and folder, without audio", async () => {
        const id = await duplicateDBNote(1)
        expect(rows(`SELECT workspaceID, folderID, name, color FROM note WHERE id = ${id}`)[0])
            .toEqual({ workspaceID: 1, folderID: null, name: "Prima (copia)", color: "#ff0000" })
        expect(await noteTree(id)).toEqual(await noteTree(1))
        expect((await noteTree(id))[0].sections[0].tasks[1].subtasks[0].subtasks[0].text).toBe("Nipote")
        expect(rows(`SELECT COUNT(*) AS n FROM audio_file WHERE section_groupID IN (SELECT id FROM section_group WHERE noteID = ${id})`)[0].n).toBe(0)
        const copied = JSON.stringify(rows(`SELECT text FROM task WHERE sectionID IN (SELECT id FROM section WHERE groupID IN (SELECT id FROM section_group WHERE noteID = ${id}))`))
        expect(copied).not.toContain("Eliminato")
        expect(copied).not.toContain("Figlio di eliminato")
    })

    it("places the copy right after the original and shifts the following siblings", async () => {
        const id = await duplicateDBNote(1)
        expect(order("note", "workspaceID = 1 AND folderID IS NULL")).toEqual(["Prima@0", "Prima (copia)@1", "Seconda@2", "Terza@3"])
        expect(id).toBeGreaterThan(4)
        // notes of other folders are untouched
        expect(order("note", "folderID = 1")).toEqual(["Prima@0"])
    })

    it("stays in the folder of the original", async () => {
        const id = await duplicateDBNote(4)
        expect(rows(`SELECT folderID, name FROM note WHERE id = ${id}`)[0]).toEqual({ folderID: 1, name: "Prima (copia)" })
        expect(order("note", "folderID = 1")).toEqual(["Prima@0", "Prima (copia)@1"])
    })

    it("numbers the copies of the same note", async () => {
        await duplicateDBNote(1)
        await duplicateDBNote(1)
        const names = order("note", "workspaceID = 1 AND folderID IS NULL")
        expect(names).toEqual(["Prima@0", "Prima (copia 2)@1", "Prima (copia)@2", "Seconda@3", "Terza@4"])
    })

    it("does not count a copy in the trash as a name clash", async () => {
        const first = await duplicateDBNote(1)
        sqlite.exec(`UPDATE note SET deleted_at = datetime('now') WHERE id = ${first}`)
        const second = await duplicateDBNote(1)
        expect(rows(`SELECT name FROM note WHERE id = ${second}`)[0].name).toBe("Prima (copia)")
    })

    it("fails with a source-missing error for a missing or deleted note", async () => {
        expect(await thrown(duplicateDBNote(999))).toMatchObject({ code: "DUPLICATE_SOURCE_MISSING" })
        sqlite.exec("UPDATE note SET deleted_at = datetime('now') WHERE id = 2")
        expect(await thrown(duplicateDBNote(2))).toMatchObject({ code: "DUPLICATE_SOURCE_MISSING" })
    })

    it("writes nothing when a statement in the middle fails (and keeps the positions)", async () => {
        failOn = "INSERT INTO task"
        expect(await thrown(duplicateDBNote(1))).toMatchObject({ code: "DUPLICATE_FAILED" })
        expect(order("note", "workspaceID = 1 AND folderID IS NULL")).toEqual(["Prima@0", "Seconda@1", "Terza@2"])
        expect(rows("SELECT COUNT(*) AS n FROM section_group")[0].n).toBe(2)
    })

    it("maps a failure of the note itself to NOTE_EXISTS", async () => {
        failOn = "INSERT INTO note"
        expect(await thrown(duplicateDBNote(1))).toMatchObject({ code: "NOTE_UNKNOWN_ERROR" })
    })
})

describe("duplicateDBSection", () => {
    it("copies the section with color, archived flag and its non deleted tasks and subtasks", async () => {
        const id = await duplicateDBSection(1)
        expect(rows(`SELECT groupID, title, color, archived FROM section WHERE id = ${id}`)[0])
            .toEqual({ groupID: 1, title: "Da fare (copia)", color: "#00ff00", archived: 0 })
        const tree = await noteTree(1)
        const [original, copy] = [tree[0].sections[0], tree[0].sections[1]]
        expect(copy).toEqual({ ...original, title: "Da fare (copia)", position: 1 })
        expect(copy.tasks).toHaveLength(2)
        expect(JSON.stringify(copy)).not.toContain("Eliminato")
        // the original is untouched
        expect(rows("SELECT COUNT(*) AS n FROM task WHERE sectionID = 1")[0].n).toBe(6)
    })

    it("keeps the archived flag", async () => {
        const id = await duplicateDBSection(2)
        expect(rows(`SELECT archived, title FROM section WHERE id = ${id}`)[0]).toEqual({ archived: 1, title: "Archivio (copia)" })
    })

    it("places the copy right after the original and shifts the following sections of the group only", async () => {
        await duplicateDBSection(1)
        expect(order("section", "groupID = 1")).toEqual(["Da fare@0", "Da fare (copia)@1", "Archivio@2", "Ultima@3"])
        expect(order("section", "groupID = 2")).toEqual(["Idee@0"])
    })

    it("numbers the copies of the same section", async () => {
        await duplicateDBSection(4)
        await duplicateDBSection(4)
        expect(order("section", "groupID = 2")).toEqual(["Idee@0", "Idee (copia 2)@1", "Idee (copia)@2"])
    })

    it("fails with a source-missing error for a missing or deleted section", async () => {
        expect(await thrown(duplicateDBSection(999))).toMatchObject({ code: "DUPLICATE_SOURCE_MISSING" })
        expect(await thrown(duplicateDBSection(5))).toMatchObject({ code: "DUPLICATE_SOURCE_MISSING" })
    })

    it("writes nothing when the tasks fail to be inserted", async () => {
        failOn = "INSERT INTO task"
        expect(await thrown(duplicateDBSection(1))).toMatchObject({ code: "DUPLICATE_FAILED" })
        expect(order("section", "groupID = 1")).toEqual(["Da fare@0", "Archivio@1", "Ultima@2"])
    })
})
