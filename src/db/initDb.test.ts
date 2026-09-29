import { beforeEach, describe, expect, it, vi } from "vitest"
import type Database from "@tauri-apps/plugin-sql"
import { createMockDb, type MockDb } from "@/test/db-mock"
import { createTableAudioFile } from "./schema/audio_file"
import { createFolderTable, createFolderTrigger } from "./schema/folder"
import { createNoteTable, createNoteTrigger } from "./schema/note"
import { createSectionTable, createSectionTrigger } from "./schema/section"
import { createSectionGroupTable } from "./schema/section_group"
import { createTaskTable, createTaskTrigger } from "./schema/task"
import { createWorkspaceTable, createWorkspaceTrigger } from "./schema/workspace"
import { initDB } from "./initDb"

const v1 = [
    createWorkspaceTable,
    createFolderTable,
    createNoteTable,
    createSectionGroupTable,
    createSectionTable,
    createTaskTable,
    createTableAudioFile,
]
const v2 = [
    createWorkspaceTrigger,
    createFolderTrigger,
    createNoteTrigger,
    createSectionTrigger,
    createTaskTrigger,
]

let db: MockDb

function run() {
    return initDB(db as unknown as Database)
}

function executed(): unknown[] {
    return db.execute.mock.calls.map(c => c[0])
}

beforeEach(() => {
    db = createMockDb()
    vi.spyOn(console, "error").mockImplementation(() => undefined)
})

describe("initDB", () => {
    it("applies all migrations in order on a fresh database", async () => {
        db.select.mockResolvedValueOnce([{ user_version: 0 }])
        await run()
        expect(db.select).toHaveBeenCalledWith("PRAGMA user_version")
        expect(executed()).toEqual([...v1, "PRAGMA user_version = 1", ...v2, "PRAGMA user_version = 2"])
    })

    it("treats an empty PRAGMA result as version 0", async () => {
        db.select.mockResolvedValueOnce([])
        await run()
        expect(executed().at(-1)).toBe("PRAGMA user_version = 2")
        expect(db.execute).toHaveBeenCalledTimes(v1.length + v2.length + 2)
    })

    it("does nothing when already at the latest version", async () => {
        db.select.mockResolvedValueOnce([{ user_version: 2 }])
        await run()
        expect(db.execute).not.toHaveBeenCalled()
    })

    it("applies only the pending migrations", async () => {
        db.select.mockResolvedValueOnce([{ user_version: 1 }])
        await run()
        expect(executed()).toEqual([...v2, "PRAGMA user_version = 2"])
    })

    it("rethrows on failure and does not bump the version", async () => {
        const err = new Error("syntax error")
        db.select.mockResolvedValueOnce([{ user_version: 0 }])
        db.execute.mockImplementation(async (q: unknown) => {
            if (q === createFolderTable) throw err
            return { rowsAffected: 0, lastInsertId: 0 }
        })
        await expect(run()).rejects.toBe(err)
        expect(executed().some(q => String(q).startsWith("PRAGMA user_version ="))).toBe(false)
        expect(console.error).toHaveBeenCalled()
    })

    it("keeps the first version when the second migration fails", async () => {
        db.select.mockResolvedValueOnce([{ user_version: 0 }])
        db.execute.mockImplementation(async (q: unknown) => {
            if (q === createNoteTrigger) throw new Error("fail")
            return { rowsAffected: 0, lastInsertId: 0 }
        })
        await expect(run()).rejects.toThrow("fail")
        const pragmas = executed().filter(q => String(q).startsWith("PRAGMA user_version ="))
        expect(pragmas).toEqual(["PRAGMA user_version = 1"])
    })

    it("propagates a failing PRAGMA read", async () => {
        db.select.mockRejectedValueOnce(new Error("no pragma"))
        await expect(run()).rejects.toThrow("no pragma")
        expect(db.execute).not.toHaveBeenCalled()
    })
})
