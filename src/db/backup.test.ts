import { beforeEach, describe, expect, it, vi } from "vitest"
import { createMockDb, type MockDb } from "@/test/db-mock"

type Entry = { name: string, isFile: boolean }

let files: Map<string, number>
let db: MockDb
const closeDB = vi.fn()
const relaunch = vi.fn()
const reportError = vi.fn()
let keep = 7
let auto = true

const BACKUPS = "/data/backups"

vi.mock("@tauri-apps/api/path", () => ({
    join: vi.fn(async (...parts: string[]) => parts.join("/")),
}))
vi.mock("@tauri-apps/plugin-process", () => ({ relaunch: () => relaunch() }))
vi.mock("@tauri-apps/plugin-fs", () => ({
    exists: vi.fn(async (path: string) => path === BACKUPS || files.has(path)),
    mkdir: vi.fn(async () => undefined),
    readDir: vi.fn(async (): Promise<Entry[]> =>
        [...files.keys()].filter(p => p.startsWith(`${BACKUPS}/`)).map(p => ({ name: p.slice(BACKUPS.length + 1), isFile: true }))),
    stat: vi.fn(async (path: string) => ({ size: files.get(path) ?? 0 })),
    remove: vi.fn(async (path: string) => { files.delete(path) }),
    copyFile: vi.fn(async (from: string, to: string) => { files.set(to, files.get(from) ?? 0) }),
}))
vi.mock("./appPaths", () => ({ ensureAppFolder: async () => "/data" }))
vi.mock("./dbManager", () => ({
    DB_FILE: "easytask.db",
    getDB: async () => db,
    closeDB: () => closeDB(),
}))
vi.mock("@/lib/report-error", () => ({
    reportError: (...a: unknown[]) => reportError(...a),
    resetReportErrorDedupe: () => undefined,
}))
vi.mock("@/lib/store/preferences", () => ({
    getBackupKeep: async () => keep,
    getAutoBackup: async () => auto,
}))

import {
    backupFileName,
    createBackup,
    deleteBackup,
    listBackups,
    parseBackupName,
    restoreBackup,
    rotateBackups,
    runAutoBackup,
} from "./backup"

const at = (y: number, mo: number, d: number, h = 10, mi = 0, s = 0) => new Date(y, mo - 1, d, h, mi, s)
const seed = (name: string, size = 100) => files.set(`${BACKUPS}/${name}`, size)

beforeEach(() => {
    files = new Map()
    db = createMockDb()
    // VACUUM INTO creates the file like SQLite would
    db.execute.mockImplementation(async (sql: unknown) => {
        const path = /INTO '(.*)'/.exec(String(sql))![1].replace(/''/g, "'")
        files.set(path, 1234)
        return { rowsAffected: 0, lastInsertId: 0 }
    })
    closeDB.mockReset().mockResolvedValue(undefined)
    relaunch.mockReset().mockResolvedValue(undefined)
    reportError.mockReset()
    keep = 7
    auto = true
    vi.useRealTimers()
})

describe("backup names", () => {
    it("builds and parses names", () => {
        const date = at(2026, 3, 9, 7, 5, 2)
        expect(backupFileName(date)).toBe("easytask-20260309-070502.db")
        expect(backupFileName(date, true)).toBe("easytask-pre-restore-20260309-070502.db")
        expect(parseBackupName("easytask-20260309-070502.db")).toEqual({ date, preRestore: false })
        expect(parseBackupName("easytask-pre-restore-20260309-070502.db")).toEqual({ date, preRestore: true })
    })

    it("rejects anything else", () => {
        for (const name of ["easytask.db", "../easytask-20260309-070502.db", "easytask-2026-070502.db", "x.db"]) {
            expect(parseBackupName(name)).toBeNull()
        }
    })
})

describe("listBackups", () => {
    it("lists only backups, newest first, with their size", async () => {
        seed("easytask-20260101-100000.db", 10)
        seed("easytask-20260102-100000.db", 20)
        seed("easytask-pre-restore-20260103-100000.db", 30)
        seed("notes.txt")
        const list = await listBackups()
        expect(list.map(b => b.name)).toEqual([
            "easytask-pre-restore-20260103-100000.db",
            "easytask-20260102-100000.db",
            "easytask-20260101-100000.db",
        ])
        expect(list[0]).toMatchObject({ size: 30, preRestore: true, path: `${BACKUPS}/easytask-pre-restore-20260103-100000.db` })
    })
})

describe("createBackup", () => {
    it("runs VACUUM INTO on the database, in the backups folder", async () => {
        const backup = await createBackup("manual")
        expect(db.execute).toHaveBeenCalledTimes(1)
        expect(String(db.execute.mock.calls[0][0])).toMatch(/^VACUUM INTO '\/data\/backups\/easytask-\d{8}-\d{6}\.db'$/)
        expect(backup.size).toBe(1234)
        expect(files.has(backup.path)).toBe(true)
    })

    it("escapes single quotes in the path", async () => {
        const { join } = await import("@tauri-apps/api/path")
        vi.mocked(join).mockImplementationOnce(async () => BACKUPS).mockImplementationOnce(async () => "/da'ta/x.db")
        await createBackup("manual")
        expect(String(db.execute.mock.calls[0][0])).toBe("VACUUM INTO '/da''ta/x.db'")
    })

    it("rotates the oldest regular backups, keeping the preferred number", async () => {
        keep = 3
        for (let day = 1; day <= 5; day++) seed(`easytask-2026010${day}-100000.db`)
        seed("easytask-pre-restore-20250101-100000.db")
        await createBackup("manual")
        const names = (await listBackups()).filter(b => !b.preRestore).map(b => b.name)
        expect(names).toHaveLength(3)
        expect(names).not.toContain("easytask-20260101-100000.db")
        // the pre-restore copy is not touched by a regular rotation
        expect(files.has(`${BACKUPS}/easytask-pre-restore-20250101-100000.db`)).toBe(true)
    })

    it("keeps only the newest pre-restore copy and does not rotate", async () => {
        keep = 1
        seed("easytask-20260101-100000.db")
        seed("easytask-20260102-100000.db")
        seed("easytask-pre-restore-20250101-100000.db")
        const backup = await createBackup("pre-restore")
        expect(backup.preRestore).toBe(true)
        const names = (await listBackups()).map(b => b.name)
        expect(names).toContain(backup.name)
        expect(names).not.toContain("easytask-pre-restore-20250101-100000.db")
        expect(names).toContain("easytask-20260101-100000.db")
    })
})

describe("rotateBackups", () => {
    it("never deletes the last backup even with keep 0", async () => {
        seed("easytask-20260101-100000.db")
        seed("easytask-20260102-100000.db")
        expect(await rotateBackups(0)).toBe(1)
        expect((await listBackups()).map(b => b.name)).toEqual(["easytask-20260102-100000.db"])
    })
})

describe("runAutoBackup", () => {
    it("creates a backup when none was taken today", async () => {
        seed("easytask-20200101-100000.db")
        expect(await runAutoBackup()).toBe(true)
        expect(db.execute).toHaveBeenCalledTimes(1)
    })

    it("skips when a backup already exists today", async () => {
        await createBackup("manual")
        db.execute.mockClear()
        expect(await runAutoBackup()).toBe(false)
        expect(db.execute).not.toHaveBeenCalled()
    })

    it("does nothing when disabled", async () => {
        auto = false
        expect(await runAutoBackup()).toBe(false)
        expect(db.execute).not.toHaveBeenCalled()
    })

    it("swallows failures and reports them without a toast message", async () => {
        db.execute.mockRejectedValueOnce(new Error("disk full"))
        await expect(runAutoBackup()).resolves.toBe(false)
        expect(reportError).toHaveBeenCalledTimes(1)
        expect(reportError.mock.calls[0]).toHaveLength(1)
    })
})

describe("deleteBackup", () => {
    it("removes the file", async () => {
        seed("easytask-20260101-100000.db")
        await deleteBackup("easytask-20260101-100000.db")
        expect(files.size).toBe(0)
    })

    it("refuses names that are not backups", async () => {
        await expect(deleteBackup("../easytask.db")).rejects.toThrow("Invalid backup name")
    })
})

describe("restoreBackup", () => {
    it("takes a pre-restore copy, closes the db, replaces the file and relaunches", async () => {
        seed("easytask-20260101-100000.db", 999)
        files.set("/data/easytask.db", 5)
        files.set("/data/easytask.db-wal", 1)
        files.set("/data/easytask.db-shm", 1)
        const order: string[] = []
        db.execute.mockImplementation(async () => { order.push("vacuum"); return { rowsAffected: 0, lastInsertId: 0 } })
        closeDB.mockImplementation(async () => { order.push("close") })
        relaunch.mockImplementation(async () => { order.push("relaunch") })

        await restoreBackup("easytask-20260101-100000.db")

        expect(order).toEqual(["vacuum", "close", "relaunch"])
        expect(String(db.execute.mock.calls[0][0])).toContain("easytask-pre-restore-")
        expect(files.get("/data/easytask.db")).toBe(999)
        expect(files.has("/data/easytask.db-wal")).toBe(false)
        expect(files.has("/data/easytask.db-shm")).toBe(false)
    })

    it("fails before touching anything when the backup is missing", async () => {
        await expect(restoreBackup("easytask-20260101-100000.db")).rejects.toThrow("Backup not found")
        expect(closeDB).not.toHaveBeenCalled()
        expect(relaunch).not.toHaveBeenCalled()
    })

    it("does not relaunch when the copy fails", async () => {
        seed("easytask-20260101-100000.db")
        const { copyFile } = await import("@tauri-apps/plugin-fs")
        vi.mocked(copyFile).mockRejectedValueOnce(new Error("locked"))
        await expect(restoreBackup("easytask-20260101-100000.db")).rejects.toThrow("locked")
        expect(relaunch).not.toHaveBeenCalled()
    })
})
