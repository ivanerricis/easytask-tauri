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

// These tests run the real query SQL against a real SQLite database (schema migrated to v6)
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

import {
    createDBAudioFile, getDBAudioFile, getDBGroupAudioFiles, getDBNoteAudioFiles, getFileName, makeUniqueName,
    renameDBAudioFile, updateDBAudioFilePath,
} from "./audio"
import { emptyDBTrash, getDBTrash, purgeDBItem, restoreDBItem } from "./trash"
import { deleteDBItem } from "./shared_queries"

const rows = (sql: string) => sqlite.prepare(sql).all() as Record<string, unknown>[]

beforeEach(() => {
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
    sqlite.exec(`
        INSERT INTO workspace (id, name) VALUES (1, 'WS');
        INSERT INTO folder (id, workspaceID, folderID, name) VALUES (1, 1, NULL, 'F');
        INSERT INTO note (id, workspaceID, folderID, name) VALUES (1, 1, 1, 'N');
        INSERT INTO section_group (id, noteID, position) VALUES (1, 1, 0), (2, 1, 1);
        INSERT INTO section (id, groupID, title) VALUES (1, 1, 'S1'), (2, 2, 'S2');
    `)
})

describe("helpers", () => {
    it("extracts the file name from Windows and POSIX paths", () => {
        expect(getFileName("C:\\Music\\song.mp3")).toBe("song.mp3")
        expect(getFileName("/home/me/song.mp3")).toBe("song.mp3")
    })

    it("adds a counter before the extension", () => {
        expect(makeUniqueName("a.mp3", [])).toBe("a.mp3")
        expect(makeUniqueName("a.mp3", ["A.MP3"])).toBe("a (2).mp3")
        expect(makeUniqueName("a.mp3", ["a.mp3", "a (2).mp3"])).toBe("a (3).mp3")
        expect(makeUniqueName("noext", ["noext"])).toBe("noext (2)")
    })
})

describe("audio queries", () => {
    it("adds files with the basename as name, appended by position, only the path is stored", async () => {
        const a = await createDBAudioFile(1, "C:\\Music\\a.mp3")
        const b = await createDBAudioFile(1, "C:\\Music\\b.wav")
        await createDBAudioFile(2, "C:\\Music\\c.ogg")
        expect(a).toMatchObject({ name: "a.mp3", path: "C:\\Music\\a.mp3", position: 0, section_groupID: 1 })
        expect(b.position).toBe(1)
        expect((await getDBGroupAudioFiles(1)).map(f => f.name)).toEqual(["a.mp3", "b.wav"])
        expect((await getDBGroupAudioFiles(2))[0].position).toBe(0)
    })

    it("generates a unique name for the same file name in a group, also against trashed files", async () => {
        const first = await createDBAudioFile(1, "C:\\x\\song.mp3")
        const second = await createDBAudioFile(1, "C:\\y\\song.mp3")
        expect(second.name).toBe("song (2).mp3")
        await deleteDBItem("audio_file", first.id)
        expect((await createDBAudioFile(1, "C:\\z\\song.mp3")).name).toBe("song (3).mp3")
        expect((await createDBAudioFile(2, "C:\\z\\song.mp3")).name).toBe("song.mp3")
    })

    it("lists the files of a note grouped by group, without deleted files or deleted groups", async () => {
        await createDBAudioFile(1, "/m/a.mp3")
        const b = await createDBAudioFile(1, "/m/b.mp3")
        await createDBAudioFile(2, "/m/c.mp3")
        await deleteDBItem("audio_file", b.id)
        let byGroup = await getDBNoteAudioFiles(1)
        expect(Object.keys(byGroup)).toEqual(["1", "2"])
        expect(byGroup[1].map(f => f.name)).toEqual(["a.mp3"])

        await deleteDBItem("section_group", 2)
        byGroup = await getDBNoteAudioFiles(1)
        expect(Object.keys(byGroup)).toEqual(["1"])
    })

    it("renames and relinks, keeping the name on relink; rejects duplicate and empty names", async () => {
        const a = await createDBAudioFile(1, "/m/a.mp3")
        await createDBAudioFile(1, "/m/b.mp3")
        await updateDBAudioFilePath(a.id, "/new/a.mp3")
        expect(await getDBAudioFile(a.id)).toMatchObject({ name: "a.mp3", path: "/new/a.mp3" })
        await renameDBAudioFile(a.id, "Intro")
        expect((await getDBAudioFile(a.id))?.name).toBe("Intro")
        await expect(renameDBAudioFile(a.id, "b.mp3")).rejects.toMatchObject({ code: "AUDIO_EXISTS" })
        await expect(renameDBAudioFile(a.id, "")).rejects.toMatchObject({ code: "AUDIO_CHECK_FAILED" })
        await expect(updateDBAudioFilePath(a.id, "")).rejects.toMatchObject({ code: "AUDIO_CHECK_FAILED" })
    })

    it("rejects an audio file for a missing group (foreign key)", async () => {
        await expect(createDBAudioFile(99, "/m/a.mp3")).rejects.toBeTruthy()
    })
})

describe("audio files in the trash", () => {
    it("soft delete hides the file and lists it with note and group context", async () => {
        const a = await createDBAudioFile(2, "/m/a.mp3")
        await deleteDBItem("audio_file", a.id)
        expect(await getDBAudioFile(a.id)).toBeNull()
        expect(rows("SELECT id FROM audio_file")).toHaveLength(1)
        const trash = await getDBTrash(1)
        expect(trash).toHaveLength(1)
        expect(trash[0]).toMatchObject({ type: "audio_file", id: a.id, name: "a.mp3", context: "Nota N › Gruppo 2" })
    })

    it("restore brings back the file with its deleted ancestors (group, note, folders)", async () => {
        const a = await createDBAudioFile(1, "/m/a.mp3")
        await deleteDBItem("audio_file", a.id)
        await deleteDBItem("section_group", 1)
        await deleteDBItem("note", 1)
        await deleteDBItem("folder", 1)
        await restoreDBItem("audio_file", a.id)
        expect(rows("SELECT deleted_at FROM audio_file")[0].deleted_at).toBeNull()
        expect(rows("SELECT deleted_at FROM section_group WHERE id = 1")[0].deleted_at).toBeNull()
        expect(rows("SELECT deleted_at FROM note")[0].deleted_at).toBeNull()
        expect(rows("SELECT deleted_at FROM folder")[0].deleted_at).toBeNull()
        expect(await getDBGroupAudioFiles(1)).toHaveLength(1)
    })

    it("purge removes only trashed files and empty trash removes the trashed ones of the workspace", async () => {
        const a = await createDBAudioFile(1, "/m/a.mp3")
        const b = await createDBAudioFile(1, "/m/b.mp3")
        const c = await createDBAudioFile(2, "/m/c.mp3")
        await purgeDBItem("audio_file", a.id)
        expect(rows("SELECT id FROM audio_file")).toHaveLength(3)

        await deleteDBItem("audio_file", a.id)
        await deleteDBItem("audio_file", c.id)
        await purgeDBItem("audio_file", a.id)
        expect(rows("SELECT id FROM audio_file").map(r => r.id)).toEqual([b.id, c.id])

        await emptyDBTrash(1)
        expect(rows("SELECT id FROM audio_file").map(r => r.id)).toEqual([b.id])
        expect(await getDBTrash(1)).toEqual([])
    })

    it("a purged group takes its trashed audio files with it (cascade)", async () => {
        const a = await createDBAudioFile(1, "/m/a.mp3")
        await deleteDBItem("audio_file", a.id)
        await deleteDBItem("section_group", 1)
        await emptyDBTrash(1)
        expect(rows("SELECT id FROM audio_file")).toEqual([])
    })
})
