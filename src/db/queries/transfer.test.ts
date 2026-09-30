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

// These tests run the real query SQL against a real SQLite database (schema migrated to v8)
let sqlite: DatabaseSync
// Set to a substring to make the next matching statement fail (simulates a failure in the middle of the creation)
let failOn: string | null = null

vi.mock("../dbManager", () => ({
    getDB: vi.fn(async () => ({
        execute: async (sql: string, params: unknown[] = []) => {
            if (failOn && sql.includes(failOn)) throw new Error("boom")
            const r = sqlite.prepare(sql).run(...(params as SQLInputValue[]))
            return { rowsAffected: Number(r.changes), lastInsertId: Number(r.lastInsertRowid) }
        },
        select: async (sql: string, params: unknown[] = []) => sqlite.prepare(sql).all(...(params as SQLInputValue[])),
    })),
}))

vi.mock("@tauri-apps/plugin-fs", () => ({ exists: vi.fn(async () => true) }))

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
    sqlite = new DatabaseSync(":memory:")
    sqlite.exec("PRAGMA foreign_keys=ON")
    for (const sql of [
        createWorkspaceTable, createFolderTable, createNoteTable, createSectionGroupTable,
        createSectionTable, createTaskTable, createTableAudioFile,
        createWorkspaceTrigger, createFolderTrigger, createNoteTrigger, createSectionTrigger, createTaskTrigger,
    ]) sqlite.exec(sql)
    for (const sql of [migrateToV3, migrateToV4, migrateToV6, migrateToV7, migrateToV8]) sqlite.exec(sql)
    sqlite.exec(`
        INSERT INTO workspace (id, name) VALUES (1, 'WS'), (2, 'Other');
        INSERT INTO folder (id, workspaceID, name) VALUES (1, 1, 'Cartella');
        INSERT INTO note (id, workspaceID, name, color) VALUES (1, 1, 'Sorgente', '#ff0000');
        INSERT INTO note (id, workspaceID, folderID, name, position) VALUES (2, 1, 1, 'Nella cartella', 0);

        INSERT INTO section_group (id, noteID, position, name) VALUES (1, 1, 0, 'Sprint'), (2, 1, 1, NULL), (3, 1, 2, 'Eliminato');
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

    it("deletes the partial workspace when the import fails", async () => {
        const data = await exportOf()
        failOn = "INSERT INTO task"
        expect(await thrown(importDBWorkspace(data))).toMatchObject({ code: "TRANSFER_IMPORT_FAILED" })
        expect(rows("SELECT id FROM workspace")).toEqual([{ id: 1 }, { id: 2 }])
        expect(rows("SELECT id FROM note WHERE workspaceID > 2")).toEqual([])
    })
})
