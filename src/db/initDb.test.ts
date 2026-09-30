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
import { migrateToV3 } from "./schema/v3"
import { migrateToV4 } from "./schema/v4"
import { migrateToV5 } from "./schema/v5"
import { migrateToV6 } from "./schema/v6"
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

const v3 = [migrateToV3]
const v4 = [migrateToV4]
const v5 = [migrateToV5]
const v6 = [migrateToV6]

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
        expect(executed()).toEqual([...v1, "PRAGMA user_version = 1", ...v2, "PRAGMA user_version = 2", ...v3, "PRAGMA user_version = 3", ...v4, "PRAGMA user_version = 4", ...v5, "PRAGMA user_version = 5", ...v6, "PRAGMA user_version = 6"])
    })

    it("treats an empty PRAGMA result as version 0", async () => {
        db.select.mockResolvedValueOnce([])
        await run()
        expect(executed().at(-1)).toBe("PRAGMA user_version = 6")
        expect(db.execute).toHaveBeenCalledTimes(v1.length + v2.length + v3.length + v4.length + v5.length + v6.length + 6)
    })

    it("does nothing when already at the latest version", async () => {
        db.select.mockResolvedValueOnce([{ user_version: 6 }])
        const beforeMigrate = vi.fn()
        await initDB(db as unknown as Database, { beforeMigrate })
        expect(db.execute).not.toHaveBeenCalled()
        expect(beforeMigrate).not.toHaveBeenCalled()
    })

    it("applies only the pending migrations", async () => {
        db.select.mockResolvedValueOnce([{ user_version: 1 }])
        await run()
        expect(executed()).toEqual([...v2, "PRAGMA user_version = 2", ...v3, "PRAGMA user_version = 3", ...v4, "PRAGMA user_version = 4", ...v5, "PRAGMA user_version = 5", ...v6, "PRAGMA user_version = 6"])
    })

    it("runs the v3 rebuild as one script: foreign keys off before BEGIN, on again after COMMIT", () => {
        expect(migrateToV3.indexOf("PRAGMA foreign_keys=OFF")).toBeLessThan(migrateToV3.indexOf("BEGIN"))
        expect(migrateToV3.indexOf("COMMIT")).toBeLessThan(migrateToV3.lastIndexOf("PRAGMA foreign_keys=ON"))
    })

    it("calls beforeMigrate with the current version before migrating an existing database", async () => {
        db.select.mockResolvedValueOnce([{ user_version: 2 }])
        const beforeMigrate = vi.fn(async () => {
            expect(db.execute).not.toHaveBeenCalled()
        })
        await initDB(db as unknown as Database, { beforeMigrate })
        expect(beforeMigrate).toHaveBeenCalledWith(2, 6)
    })

    it("does not call beforeMigrate on a fresh database", async () => {
        db.select.mockResolvedValueOnce([{ user_version: 0 }])
        const beforeMigrate = vi.fn()
        await initDB(db as unknown as Database, { beforeMigrate })
        expect(beforeMigrate).not.toHaveBeenCalled()
    })

    it("does not migrate when beforeMigrate (the backup) fails", async () => {
        db.select.mockResolvedValueOnce([{ user_version: 2 }])
        await expect(initDB(db as unknown as Database, { beforeMigrate: async () => { throw new Error("no backup") } }))
            .rejects.toThrow("no backup")
        expect(db.execute).not.toHaveBeenCalled()
    })

    it("attempts a rollback and re-enables foreign keys when the v3 script fails", async () => {
        db.select.mockResolvedValueOnce([{ user_version: 2 }])
        db.execute.mockImplementation(async (q: unknown) => {
            if (q === migrateToV3) throw new Error("boom")
            return { rowsAffected: 0, lastInsertId: 0 }
        })
        await expect(run()).rejects.toThrow("boom")
        expect(executed()).toEqual([migrateToV3, "ROLLBACK", "PRAGMA foreign_keys=ON"])
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
