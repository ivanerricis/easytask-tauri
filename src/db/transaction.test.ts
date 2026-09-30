// @vitest-environment node
/// <reference types="node" />
import { beforeEach, describe, expect, it, vi } from "vitest"
import { DatabaseSync } from "node:sqlite"

let sqlite: DatabaseSync

vi.mock("./dbManager", () => ({ getDB: vi.fn(async () => ({ path: "sqlite:test.db" })) }))
vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }))

import { invoke } from "@tauri-apps/api/core"
import { createRecordingInvoke, createSqliteInvoke, resolveTxParam, runSqliteTransaction } from "@/test/db-mock"
import { Transaction, TransactionError, runTransaction } from "./transaction"

const rows = (sql: string) => sqlite.prepare(sql).all() as Record<string, unknown>[]

beforeEach(() => {
    sqlite = new DatabaseSync(":memory:")
    sqlite.exec(`
        CREATE TABLE parent (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE);
        CREATE TABLE child (id INTEGER PRIMARY KEY AUTOINCREMENT, parentID INTEGER NOT NULL REFERENCES parent(id), label TEXT);
    `)
    vi.mocked(invoke).mockReset()
    vi.mocked(invoke).mockImplementation(createSqliteInvoke(() => sqlite) as unknown as typeof invoke)
})

describe("Transaction builder", () => {
    it("returns statement indexes and builds references", () => {
        const tx = new Transaction()
        const first = tx.add("INSERT INTO parent (name) VALUES (?)", ["a"])
        const second = tx.add("SELECT 1")
        expect([first, second, tx.length]).toEqual([0, 1, 2])
        expect(tx.idOf(first)).toEqual({ $ref: 0, offset: 0 })
        expect(tx.idOf(second, 3)).toEqual({ $ref: 1, offset: 3 })
    })

    it("refuses a reference to a statement that does not exist yet", () => {
        const tx = new Transaction()
        expect(() => tx.idOf(0)).toThrow()
        tx.add("SELECT 1")
        expect(() => tx.idOf(1)).toThrow()
        expect(() => tx.idOf(-1)).toThrow()
    })

    it("insertRows references every row as last - (n - 1 - i)", () => {
        const tx = new Transaction()
        const refs = tx.insertRows("parent", ["name"], [["a"], ["b"], ["c"]])
        expect(refs).toEqual([{ $ref: 0, offset: 2 }, { $ref: 0, offset: 1 }, { $ref: 0, offset: 0 }])
        expect(tx.length).toBe(1)
    })

    it("insertRows splits big inserts in chunks of 500 rows, each with its own offsets", () => {
        const tx = new Transaction()
        const refs = tx.insertRows("parent", ["name"], Array.from({ length: 501 }, (_, i) => [`p${i}`]))
        expect(tx.length).toBe(2)
        expect(refs).toHaveLength(501)
        expect(refs[0]).toEqual({ $ref: 0, offset: 499 })
        expect(refs[499]).toEqual({ $ref: 0, offset: 0 })
        expect(refs[500]).toEqual({ $ref: 1, offset: 0 })
    })

    it("insertRows with no rows adds nothing", () => {
        const tx = new Transaction()
        expect(tx.insertRows("parent", ["name"], [])).toEqual([])
        expect(tx.length).toBe(0)
    })

    it("run sends the statements and the db key to db_transaction", async () => {
        const recorder = createRecordingInvoke()
        vi.mocked(invoke).mockImplementation(recorder.invoke as unknown as typeof invoke)
        const tx = new Transaction()
        tx.add("SELECT ?", [1])
        await tx.run()
        expect(invoke).toHaveBeenCalledWith("db_transaction", { db: "sqlite:test.db", statements: [{ sql: "SELECT ?", params: [1] }] })
    })

    it("runTransaction with no statements does not call the backend", async () => {
        await expect(runTransaction([])).resolves.toEqual([])
        expect(invoke).not.toHaveBeenCalled()
    })
})

describe("transactions on a real SQLite database", () => {
    it("commits everything and resolves references (single and multi-row inserts)", async () => {
        const tx = new Transaction()
        const parents = tx.insertRows("parent", ["name"], [["a"], ["b"], ["c"]])
        const single = tx.add("INSERT INTO parent (name) VALUES (?)", ["d"])
        tx.insertRows("child", ["parentID", "label"], [[parents[0], "of a"], [parents[2], "of c"], [tx.idOf(single), "of d"]])
        const results = await tx.run()

        expect(results).toHaveLength(3)
        expect(results[0]).toMatchObject({ rowsAffected: 3, lastInsertId: 3 })
        expect(rows("SELECT c.label, p.name FROM child c JOIN parent p ON p.id = c.parentID ORDER BY c.id")).toEqual([
            { label: "of a", name: "a" }, { label: "of c", name: "c" }, { label: "of d", name: "d" },
        ])
    })

    it("rolls everything back when a later statement fails and reports its index", async () => {
        const tx = new Transaction()
        const parent = tx.add("INSERT INTO parent (name) VALUES (?)", ["a"])
        tx.add("INSERT INTO child (parentID, label) VALUES (?, ?)", [tx.idOf(parent), "ok"])
        tx.add("INSERT INTO parent (name) VALUES (?)", ["a"]) // UNIQUE violation

        const error = await tx.run().catch((e: unknown) => e)
        expect(error).toBeInstanceOf(TransactionError)
        expect((error as TransactionError).statementIndex).toBe(2)
        expect((error as TransactionError).message).toContain("UNIQUE")
        expect(rows("SELECT * FROM parent")).toEqual([])
        expect(rows("SELECT * FROM child")).toEqual([])
    })

    it("a failed transaction leaves the database usable for the next one", async () => {
        const failing = new Transaction()
        failing.add("INSERT INTO nope VALUES (1)")
        await expect(failing.run()).rejects.toBeInstanceOf(TransactionError)
        const ok = new Transaction()
        ok.add("INSERT INTO parent (name) VALUES (?)", ["x"])
        await expect(ok.run()).resolves.toHaveLength(1)
        expect(rows("SELECT name FROM parent")).toEqual([{ name: "x" }])
    })

    it("maps booleans and undefined like the Rust command", async () => {
        const tx = new Transaction()
        tx.add("INSERT INTO parent (name) VALUES (?)", [undefined])
        tx.add("INSERT INTO child (parentID, label) VALUES (1, ?)", [true])
        await tx.run()
        expect(rows("SELECT name FROM parent")).toEqual([{ name: null }])
        expect(rows("SELECT CAST(label AS INTEGER) AS label FROM child")).toEqual([{ label: 1 }])
    })

    it("a failure without statement index still becomes a TransactionError", async () => {
        vi.mocked(invoke).mockRejectedValueOnce("database sqlite:test.db is not loaded")
        const error = await runTransaction([{ sql: "SELECT 1", params: [] }]).catch((e: unknown) => e)
        expect(error).toBeInstanceOf(TransactionError)
        expect((error as TransactionError).statementIndex).toBeNull()
        expect((error as TransactionError).message).toContain("not loaded")
    })
})

describe("$ref resolution (mirrors the Rust command)", () => {
    const results = [{ rowsAffected: 3, lastInsertId: 10 }, { rowsAffected: 1, lastInsertId: 20 }]

    it("resolves to lastInsertId minus offset", () => {
        expect(resolveTxParam({ $ref: 0, offset: 2 }, results)).toBe(8)
        expect(resolveTxParam({ $ref: 1, offset: 0 }, results)).toBe(20)
        expect(resolveTxParam({ $ref: 1 }, results)).toBe(20)
    })

    it("rejects references to a statement that has not run yet or invalid indexes", () => {
        expect(() => resolveTxParam({ $ref: 2, offset: 0 }, results)).toThrow(/earlier statement/)
        expect(() => resolveTxParam({ $ref: -1, offset: 0 }, results)).toThrow()
        expect(() => resolveTxParam({ $ref: "0", offset: 0 }, results)).toThrow()
    })

    it("leaves plain values alone", () => {
        expect(resolveTxParam("text", results)).toBe("text")
        expect(resolveTxParam(5, results)).toBe(5)
        expect(resolveTxParam(null, results)).toBeNull()
    })

    it("a forward reference fails the statement and rolls back", () => {
        expect(() => runSqliteTransaction(sqlite, [
            { sql: "INSERT INTO parent (name) VALUES (?)", params: ["a"] },
            { sql: "INSERT INTO child (parentID, label) VALUES (?, ?)", params: [{ $ref: 5, offset: 0 }, "x"] },
        ])).toThrow(/^statement 1 failed/)
        expect(rows("SELECT * FROM parent")).toEqual([])
    })
})
