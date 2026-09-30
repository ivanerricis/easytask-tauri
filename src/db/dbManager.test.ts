import { beforeEach, describe, expect, it, vi } from "vitest"
import { createMockDb, type MockDb } from "@/test/db-mock"

const load = vi.fn()
const ensureAppFolder = vi.fn()
const initDB = vi.fn()

vi.mock("@tauri-apps/plugin-sql", () => ({ default: { load: (...a: unknown[]) => load(...a) } }))
const copyFile = vi.fn()
vi.mock("@tauri-apps/plugin-fs", () => ({ exists: vi.fn(), mkdir: vi.fn(), copyFile: (...a: unknown[]) => copyFile(...a) }))
vi.mock("@tauri-apps/api/path", () => ({
    BaseDirectory: { Document: 1 },
    documentDir: vi.fn(async () => "/docs"),
    join: vi.fn(async (...parts: string[]) => parts.join("/")),
}))
vi.mock("./appPaths", () => ({ ensureAppFolder: () => ensureAppFolder() }))
vi.mock("./initDb", () => ({ initDB: (...a: unknown[]) => initDB(...a) }))

let db: MockDb

// The module keeps a singleton promise, so load a fresh copy per test
async function freshGetDB() {
    vi.resetModules()
    return (await import("./dbManager")).getDB
}

beforeEach(() => {
    db = createMockDb()
    load.mockReset().mockImplementation(async () => db)
    ensureAppFolder.mockReset().mockResolvedValue("/docs/EasyTask")
    initDB.mockReset().mockResolvedValue(undefined)
    copyFile.mockReset().mockResolvedValue(undefined)
})

describe("backup before migration", () => {
    async function runHook(currentVersion: number) {
        const getDB = await freshGetDB()
        await getDB()
        const options = initDB.mock.calls[0][1] as { beforeMigrate: (v: number) => Promise<void> }
        await options.beforeMigrate(currentVersion)
    }

    it("checkpoints the WAL and copies the db before migrating from v2", async () => {
        await runHook(2)
        expect(db.select).toHaveBeenCalledWith("PRAGMA wal_checkpoint(TRUNCATE)")
        expect(copyFile).toHaveBeenCalledWith(
            "EasyTask/easytask.db",
            "EasyTask/easytask.backup-v2.db",
            { fromPathBaseDir: 1, toPathBaseDir: 1 },
        )
    })

    it("does not copy when the database is already at v3", async () => {
        await runHook(3)
        expect(copyFile).not.toHaveBeenCalled()
    })

    it("propagates a failing copy so the migration is aborted", async () => {
        copyFile.mockRejectedValueOnce(new Error("disk full"))
        await expect(runHook(2)).rejects.toThrow("disk full")
    })
})

describe("getDB", () => {
    it("loads the sqlite file and runs the migrations", async () => {
        const getDB = await freshGetDB()
        const result = await getDB()
        expect(result).toBe(db)
        expect(load).toHaveBeenCalledWith("sqlite:/docs/EasyTask/easytask.db")
        expect(initDB).toHaveBeenCalledWith(db, expect.objectContaining({ beforeMigrate: expect.any(Function) }))
    })

    it("creates the database once for concurrent calls", async () => {
        const getDB = await freshGetDB()
        const [a, b, c] = await Promise.all([getDB(), getDB(), getDB()])
        expect(a).toBe(b)
        expect(b).toBe(c)
        expect(load).toHaveBeenCalledTimes(1)
        expect(initDB).toHaveBeenCalledTimes(1)
    })

    it("memoizes the promise across sequential calls", async () => {
        const getDB = await freshGetDB()
        const p1 = getDB()
        await p1
        expect(getDB()).toBe(p1)
        expect(load).toHaveBeenCalledTimes(1)
    })

    it("closes the connection and rejects when the migration fails", async () => {
        initDB.mockRejectedValueOnce(new Error("migration failed"))
        const getDB = await freshGetDB()
        await expect(getDB()).rejects.toThrow("migration failed")
        expect(db.close).toHaveBeenCalledTimes(1)
    })

    it("still rejects with the migration error if close fails", async () => {
        initDB.mockRejectedValueOnce(new Error("migration failed"))
        db.close.mockRejectedValueOnce(new Error("close failed"))
        const getDB = await freshGetDB()
        await expect(getDB()).rejects.toThrow("migration failed")
    })

    it("resets after a failure so the next call retries", async () => {
        load.mockRejectedValueOnce(new Error("cannot open"))
        const getDB = await freshGetDB()
        await expect(getDB()).rejects.toThrow("cannot open")
        await expect(getDB()).resolves.toBe(db)
        expect(load).toHaveBeenCalledTimes(2)
    })

    it("shares the same failure among concurrent callers", async () => {
        ensureAppFolder.mockRejectedValueOnce(new Error("no folder"))
        const getDB = await freshGetDB()
        const results = await Promise.allSettled([getDB(), getDB()])
        expect(results.map(r => r.status)).toEqual(["rejected", "rejected"])
        expect(ensureAppFolder).toHaveBeenCalledTimes(1)
    })
})
