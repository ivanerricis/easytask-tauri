// @vitest-environment node
/// <reference types="node" />
import { beforeEach, describe, expect, it, vi } from "vitest"
import { DatabaseSync, type SQLInputValue } from "node:sqlite"
import { MAX_IMPORT_ITEMS } from "@/types/transfer"
import { latestSchema } from "../schema/initial"

// These tests run the real query SQL against a real SQLite database (schema migrated to v8)
let sqlite: DatabaseSync
// Set to a substring to make the next matching statement fail (simulates a failure in the middle of the creation)
let failOn: string | null = null
// Answer of the Rust audio_file_exists command (used by the default existence check)
let audioFileExists: (path: string) => boolean = () => true

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
    const sqliteInvoke = createSqliteInvoke(() => sqlite, { shouldFail: sql => failOn !== null && sql.includes(failOn) })
    return {
        invoke: vi.fn(async (command: string, args?: { path?: string, statements?: never }) =>
            command === "audio_file_exists" ? audioFileExists(args?.path ?? "") : sqliteInvoke(command, args)),
    }
})

import { buildDBWorkspaceExport, importDBWorkspace, validateWorkspaceExport } from "./transfer"

const rows = (sql: string) => sqlite.prepare(sql).all() as Record<string, unknown>[]

async function thrown(p: Promise<unknown>): Promise<unknown> {
    try {
        await p
    } catch (e) {
        return e
    }
    throw new Error("expected rejection")
}

beforeEach(() => {
    failOn = null
    audioFileExists = () => true
    sqlite = new DatabaseSync(":memory:")
    sqlite.exec("PRAGMA foreign_keys=ON")
    for (const sql of latestSchema) sqlite.exec(sql)
    sqlite.exec(`
        INSERT INTO workspace (id, name) VALUES (1, 'WS'), (2, 'Other');
        INSERT INTO folder (id, workspaceID, name) VALUES (1, 1, 'Cartella');
        INSERT INTO note (id, workspaceID, name, color) VALUES (1, 1, 'Sorgente', '#ff0000');
        INSERT INTO note (id, workspaceID, folderID, name, position) VALUES (2, 1, 1, 'Nella cartella', 0);

        INSERT INTO section_group (id, noteID, position, name, color) VALUES (1, 1, 0, 'Sprint', '#abcdef'), (2, 1, 1, NULL, NULL), (3, 1, 2, 'Eliminato', NULL);
        INSERT INTO section (id, groupID, title, color, archived, position) VALUES
            (1, 1, 'Da fare', '#00ff00', 0, 0),
            (2, 1, 'Archivio', NULL, 1, 1),
            (3, 2, 'Idee', NULL, 0, 0),
            (4, 3, 'Nel gruppo eliminato', NULL, 0, 0),
            (5, 1, 'Sezione eliminata', NULL, 0, 2);
        INSERT INTO task (id, sectionID, taskID, text, description, completed, priority, archived, color, position) VALUES
            (1, 1, NULL, 'Radice B', 'descrizione', 1, 1, 0, '#0000ff', 1),
            (2, 1, NULL, 'Radice A', NULL, 0, 0, 0, NULL, 0),
            (3, 1, 1, 'Figlio 2', NULL, 0, 0, 1, NULL, 1),
            (4, 1, 1, 'Figlio 1', 'd', 1, 0, 0, '#111111', 0),
            (5, 1, 4, 'Nipote', NULL, 1, 1, 1, '#222222', 0),
            (6, 1, NULL, 'Eliminato', NULL, 0, 0, 0, NULL, 2),
            (7, 1, 6, 'Figlio di eliminato', NULL, 0, 0, 0, NULL, 0),
            (8, 1, 1, 'Figlio eliminato', NULL, 0, 0, 0, NULL, 2),
            (9, 3, NULL, 'Idea', NULL, 0, 0, 0, NULL, 0),
            (10, 4, NULL, 'Nel gruppo eliminato', NULL, 0, 0, 0, NULL, 0),
            (11, 5, NULL, 'Nella sezione eliminata', NULL, 0, 0, 0, NULL, 0);
        UPDATE task SET deleted_at = datetime('now') WHERE id IN (6, 8);
        UPDATE section SET deleted_at = datetime('now') WHERE id = 5;
        UPDATE section_group SET deleted_at = datetime('now') WHERE id = 3;

        INSERT INTO audio_file (name, path, section_groupID) VALUES ('song.mp3', '/x/song.mp3', 1);
    `)
})


const exportOf = () => buildDBWorkspaceExport(1)

describe("buildDBWorkspaceExport", () => {
    it("exports folders, notes, audio and templates without trashed items", async () => {
        sqlite.exec(`
            INSERT INTO folder (id, workspaceID, name) VALUES (2, 1, 'Cestinata');
            INSERT INTO note (id, workspaceID, folderID, name) VALUES (3, 1, 2, 'In cartella cestinata');
            INSERT INTO note (id, workspaceID, name) VALUES (4, 1, 'Cestinata');
            UPDATE folder SET deleted_at = datetime('now') WHERE id = 2;
            UPDATE note SET deleted_at = datetime('now') WHERE id = 4;
            INSERT INTO audio_file (name, path, section_groupID, position) VALUES ('gone.mp3', '/x/gone.mp3', 3, 0);
            INSERT INTO note_template (workspaceID, name, content) VALUES (1, 'T', '{"version":1,"groups":[]}');
            INSERT INTO note_template (workspaceID, name, content, deleted_at) VALUES (1, 'T2', '{"version":1,"groups":[]}', datetime('now'));
        `)
        const data = await exportOf()
        expect(data).toMatchObject({ format: "easytask-workspace", version: 1, workspace: { name: "WS", color: null } })
        expect(data.folders.map(f => f.name)).toEqual(["Cartella"])
        expect(data.folders[0].parentRef).toBeNull()
        expect(data.notes.map(n => n.name).sort()).toEqual(["Nella cartella", "Sorgente"])
        const source = data.notes.find(n => n.name === "Sorgente")!
        expect(source.folderRef).toBeNull()
        expect(source.content.groups.map(g => g.name)).toEqual(["Sprint", null])
        expect(source.audio).toEqual([{ groupIndex: 0, name: "song.mp3", path: "/x/song.mp3", position: 0 }])
        expect(data.notes.find(n => n.name === "Nella cartella")!.folderRef).toBe(data.folders[0].ref)
        expect(data.templates.map(t => t.name)).toEqual(["T"])
    })

    it("fails for a missing workspace", async () => {
        expect(await thrown(buildDBWorkspaceExport(99))).toMatchObject({ code: "TRANSFER_WORKSPACE_MISSING" })
    })
})

describe("validateWorkspaceExport", () => {
    it("accepts an exported file", async () => {
        const data = JSON.parse(JSON.stringify(await exportOf()))
        expect(validateWorkspaceExport(data)).toEqual(data)
    })

    it("rejects a wrong format, version and malformed structures", async () => {
        const good = JSON.parse(JSON.stringify(await exportOf()))
        expect(() => validateWorkspaceExport(null)).toThrow(expect.objectContaining({ message: "Il file non è un export di EasyTask." }))
        expect(() => validateWorkspaceExport({ format: "x" })).toThrow(expect.objectContaining({ message: "Il file non è un export di EasyTask." }))
        expect(() => validateWorkspaceExport({ ...good, version: 2 })).toThrow(expect.objectContaining({ code: "TRANSFER_UNSUPPORTED_VERSION" }))
        expect(() => validateWorkspaceExport({ ...good, folders: {} })).toThrow(expect.objectContaining({ code: "TRANSFER_INVALID_FILE" }))
        expect(() => validateWorkspaceExport({ ...good, workspace: { name: "" } })).toThrow(expect.objectContaining({ code: "TRANSFER_INVALID_FILE" }))
        const badRef = { ...good, notes: [{ ...good.notes[0], folderRef: "nope" }] }
        expect(() => validateWorkspaceExport(badRef)).toThrow(expect.objectContaining({ code: "TRANSFER_INVALID_FILE" }))
        const badAudio = { ...good, notes: [{ ...good.notes[0], audio: [{ groupIndex: 9, name: "a", path: "/a", position: 0 }] }] }
        expect(() => validateWorkspaceExport(badAudio)).toThrow(expect.objectContaining({ code: "TRANSFER_INVALID_FILE" }))
        const badContent = { ...good, notes: [{ ...good.notes[0], content: { version: 1 } }] }
        expect(() => validateWorkspaceExport(badContent)).toThrow(expect.objectContaining({ code: "TRANSFER_INVALID_FILE" }))
    })
})

describe("importDBWorkspace", () => {
    it("round trips a workspace into a new one with a unique name", async () => {
        sqlite.exec(`
            INSERT INTO folder (id, workspaceID, folderID, name, position) VALUES (5, 1, 1, 'Sotto', 0);
            INSERT INTO note (id, workspaceID, folderID, name) VALUES (6, 1, 5, 'Profonda');
            INSERT INTO note_template (workspaceID, name, color, content) VALUES (1, 'T', '#123456', '{"version":1,"groups":[]}');
        `)
        const data = await exportOf()
        const first = await importDBWorkspace(data)
        const second = await importDBWorkspace(data)
        expect(rows(`SELECT name FROM workspace WHERE id IN (${first.workspaceId}, ${second.workspaceId}) ORDER BY id`))
            .toEqual([{ name: "WS (importato)" }, { name: "WS (importato 2)" }])
        expect(first.skippedAudio).toBe(0)

        const again = await buildDBWorkspaceExport(first.workspaceId)
        const strip = (d: typeof data) => ({
            folders: d.folders.map(f => ({ name: f.name, parent: d.folders.find(p => p.ref === f.parentRef)?.name ?? null, position: f.position })),
            notes: d.notes.map(n => ({
                name: n.name, folder: d.folders.find(f => f.ref === n.folderRef)?.name ?? null,
                color: n.color, position: n.position, content: n.content, audio: n.audio,
            })).sort((a, b) => a.name.localeCompare(b.name)),
            templates: d.templates,
        })
        expect(strip(again)).toEqual(strip(data))
        expect(rows(`SELECT sourceNoteID FROM note_template WHERE workspaceID = ${first.workspaceId}`)).toEqual([{ sourceNoteID: null }])
    })

    it("skips audio files that do not exist or whose check throws", async () => {
        const data = await exportOf()
        const note = data.notes.find(n => n.name === "Sorgente")!
        note.audio.push({ groupIndex: 0, name: "b.mp3", path: "/x/b.mp3", position: 1 }, { groupIndex: 1, name: "c.mp3", path: "/x/c.mp3", position: 0 })
        const { workspaceId, skippedAudio } = await importDBWorkspace(data, {
            audioExists: async path => {
                if (path.endsWith("b.mp3")) return false
                if (path.endsWith("c.mp3")) throw new Error("denied")
                return true
            },
        })
        expect(skippedAudio).toBe(2)
        const files = rows(`SELECT a.name FROM audio_file a JOIN section_group g ON g.id = a.section_groupID
            JOIN note n ON n.id = g.noteID WHERE n.workspaceID = ${workspaceId}`)
        expect(files).toEqual([{ name: "song.mp3" }])
    })

    it("rolls the whole import back when a statement fails (nothing is created)", async () => {
        const data = await exportOf()
        const counts = () => ["workspace", "folder", "note", "section_group", "section", "task", "audio_file", "note_template"]
            .map(table => rows(`SELECT COUNT(*) AS c FROM ${table}`)[0].c)
        const before = counts()
        // The workspace is the first statement: fail at later stages
        for (const stage of ["INSERT INTO folder", "INSERT INTO task", "INSERT INTO audio_file"]) {
            failOn = stage
            expect(await thrown(importDBWorkspace(data))).toMatchObject({ code: "TRANSFER_IMPORT_FAILED" })
            expect(counts()).toEqual(before)
        }
        failOn = null
        // The database is still usable
        await expect(importDBWorkspace(data)).resolves.toMatchObject({ workspaceId: expect.any(Number) })
    })
})

describe("group color in export/import", () => {
    const groupColors = (workspaceId: number) => rows(`SELECT g.name, g.color FROM section_group g JOIN note n ON n.id = g.noteID
        WHERE n.workspaceID = ${workspaceId} AND n.name = 'Sorgente' ORDER BY g.position`)

    it("exports the color of the groups and imports it back", async () => {
        const data = await exportOf()
        const source = data.notes.find(n => n.name === "Sorgente")!
        expect(source.content.groups.map(g => g.color)).toEqual(["#abcdef", null])
        const { workspaceId } = await importDBWorkspace(JSON.parse(JSON.stringify(data)))
        expect(groupColors(workspaceId)).toEqual([{ name: "Sprint", color: "#abcdef" }, { name: null, color: null }])
    })

    it("still imports files created before groups had a color", async () => {
        const data = JSON.parse(JSON.stringify(await exportOf()))
        for (const note of data.notes) for (const group of note.content.groups) delete group.color
        expect(() => validateWorkspaceExport(data)).not.toThrow()
        const { workspaceId } = await importDBWorkspace(data)
        expect(groupColors(workspaceId)).toEqual([{ name: "Sprint", color: null }, { name: null, color: null }])
    })

    it("rejects a color that is not a string", async () => {
        const data = JSON.parse(JSON.stringify(await exportOf()))
        data.notes[0].content.groups[0].color = 5
        expect(() => validateWorkspaceExport(data)).toThrow(expect.objectContaining({ code: "TRANSFER_INVALID_FILE" }))
    })
})

describe("import hardening", () => {
    const clone = async () => JSON.parse(JSON.stringify(await exportOf()))

    it("replaces blank task texts and section titles with a placeholder and empty colors with null", async () => {
        const data = await clone()
        const section = data.notes.find((n: { name: string }) => n.name === "Sorgente").content.groups[0].sections[0]
        section.title = "   "
        section.color = ""
        section.tasks[0].text = " "
        section.tasks[0].color = ""
        data.folders[0].color = ""
        data.notes[0].color = ""
        data.workspace.color = ""
        const valid = validateWorkspaceExport(data)
        const { workspaceId } = await importDBWorkspace(valid)
        expect(rows(`SELECT title, color FROM section WHERE title = '(senza titolo)'`)).toEqual([{ title: "(senza titolo)", color: null }])
        expect(rows(`SELECT COUNT(*) AS c FROM task WHERE text = '(senza titolo)' AND color IS NULL`)[0].c).toBe(1)
        expect(rows(`SELECT color FROM workspace WHERE id = ${workspaceId}`)).toEqual([{ color: null }])
        expect(rows(`SELECT COUNT(*) AS c FROM folder WHERE color = ''`)[0].c).toBe(0)
        expect(rows(`SELECT COUNT(*) AS c FROM note WHERE color = ''`)[0].c).toBe(0)
    })

    it("suffixes duplicate sibling folders, notes and sections instead of failing", async () => {
        const data = await clone()
        data.folders.push({ ...data.folders[0], ref: "dup" })
        data.notes.push({ ...data.notes[1], ref: "dupNote" })
        const group = data.notes.find((n: { name: string }) => n.name === "Sorgente").content.groups[0]
        group.sections.push({ ...group.sections[0], tasks: [] })
        const { workspaceId } = await importDBWorkspace(validateWorkspaceExport(data))
        const names = (table: string) => rows(`SELECT name FROM ${table} WHERE workspaceID = ${workspaceId}`).map(r => r.name).sort()
        expect(names("folder")).toEqual(["Cartella", "Cartella (2)"])
        expect(names("note")).toEqual(["Nella cartella", "Nella cartella (2)", "Sorgente"])
        expect(rows(`SELECT COUNT(*) AS c FROM section WHERE title = 'Da fare (2)'`)[0].c).toBe(1)
    })

    it("skips audio with a disallowed extension and uses the audio_file_exists command by default", async () => {
        const data = await clone()
        const note = data.notes.find((n: { name: string }) => n.name === "Sorgente")
        note.audio.push(
            { groupIndex: 0, name: "evil.exe", path: "/x/evil.exe", position: 1 },
            { groupIndex: 0, name: "gone.mp3", path: "/x/gone.mp3", position: 2 },
            { groupIndex: 0, name: "UP.MP3", path: "/x/UP.MP3", position: 3 })
        audioFileExists = path => !path.endsWith("gone.mp3")
        const { workspaceId, skippedAudio } = await importDBWorkspace(validateWorkspaceExport(data))
        expect(skippedAudio).toBe(2)
        const files = rows(`SELECT a.name FROM audio_file a JOIN section_group g ON g.id = a.section_groupID
            JOIN note n ON n.id = g.noteID WHERE n.workspaceID = ${workspaceId} ORDER BY a.position`)
        expect(files).toEqual([{ name: "song.mp3" }, { name: "UP.MP3" }])
    })

    it("treats an error of audio_file_exists as present", async () => {
        const data = await clone()
        audioFileExists = () => { throw new Error("denied") }
        expect((await importDBWorkspace(validateWorkspaceExport(data))).skippedAudio).toBe(0)
    })

    it("rejects files with more than the maximum number of items", async () => {
        const data = await clone()
        data.notes[0].content.groups[0].sections[0].tasks = Array.from({ length: MAX_IMPORT_ITEMS + 1 }, (_, i) =>
            ({ text: "t", position: i, subtasks: [] }))
        expect(() => validateWorkspaceExport(data)).toThrow(expect.objectContaining({ code: "TRANSFER_TOO_MANY_ITEMS" }))
    })
})
