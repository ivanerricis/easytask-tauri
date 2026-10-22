import { vi } from "vitest"

// Minimal fake of the tauri-plugin-sql Database used by the query modules
export function createMockDb() {
    return {
        execute: vi.fn<(...args: unknown[]) => Promise<{ rowsAffected: number, lastInsertId: number }>>(async () => ({ rowsAffected: 1, lastInsertId: 1 })),
        select: vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => []),
        close: vi.fn(async () => true),
    }
}

export type MockDb = ReturnType<typeof createMockDb>

type FakeStatement = { sql: string, params?: unknown[] }
type FakeResult = { rowsAffected: number, lastInsertId: number }

// The part of node:sqlite's DatabaseSync used by the fake (kept structural so this file does not import node:sqlite)
type SqliteLike = {
    exec(sql: string): void
    prepare(sql: string): { run(...params: never[]): { changes: number | bigint, lastInsertRowid: number | bigint } }
}

/**
 * Resolves one param of a fake transaction like the Rust `db_transaction` command:
 * `{ $ref, offset }` becomes `results[$ref].lastInsertId - offset` (the reference must point to an earlier statement),
 * booleans become 0/1 and undefined becomes null.
 * @category Test helpers
 */
export function resolveTxParam(value: unknown, results: FakeResult[]): unknown {
    if (typeof value === "object" && value !== null && !Array.isArray(value) && "$ref" in value) {
        const { $ref, offset = 0 } = value as { $ref: unknown, offset?: number }
        if (typeof $ref !== "number" || !Number.isInteger($ref) || $ref < 0) throw new Error("$ref must be a non-negative integer")
        const target = results[$ref]
        if (!target) throw new Error(`$ref ${$ref} does not point to an earlier statement`)
        return target.lastInsertId - offset
    }
    if (typeof value === "boolean") return value ? 1 : 0
    if (value === undefined) return null
    return value
}

/**
 * Runs statements on a node:sqlite database inside BEGIN/COMMIT (ROLLBACK on the first error), mirroring the Rust
 * `db_transaction` command. Throws a string like the Tauri invoke rejection: "statement N failed: <driver message>".
 * @param shouldFail Test hook: a statement whose SQL makes it return true fails with "boom".
 * @category Test helpers
 */
export function runSqliteTransaction(
    sqlite: SqliteLike,
    statements: FakeStatement[],
    shouldFail?: (sql: string) => boolean,
): FakeResult[] {
    const results: FakeResult[] = []
    sqlite.exec("BEGIN")
    try {
        statements.forEach((statement, index) => {
            try {
                if (shouldFail?.(statement.sql)) throw new Error("boom")
                const params = (statement.params ?? []).map(param => resolveTxParam(param, results))
                const outcome = sqlite.prepare(statement.sql).run(...(params as never[]))
                results.push({ rowsAffected: Number(outcome.changes), lastInsertId: Number(outcome.lastInsertRowid) })
            } catch (error: unknown) {
                throw `statement ${index} failed: ${error instanceof Error ? error.message : String(error)}`
            }
        })
        sqlite.exec("COMMIT")
        return results
    } catch (error: unknown) {
        sqlite.exec("ROLLBACK")
        throw error
    }
}

/**
 * Fake of `invoke` from @tauri-apps/api/core that serves "db_transaction" on a real SQLite database.
 * Use it in the factory of `vi.mock("@tauri-apps/api/core", ...)`; the database is read lazily on every call.
 * @category Test helpers
 */
export function createSqliteInvoke(getSqlite: () => SqliteLike, options: { shouldFail?: (sql: string) => boolean } = {}) {
    // A plain function (not vi.fn) so that vi.restoreAllMocks() in a test cannot reset it
    return async (command: string, args?: { statements?: FakeStatement[] }) => {
        if (command !== "db_transaction") throw new Error(`Unexpected command ${command}`)
        return runSqliteTransaction(getSqlite(), args?.statements ?? [], options.shouldFail)
    }
}

/**
 * Fake of `invoke` for tests that use createMockDb: records the statements of every "db_transaction" call
 * and answers with `results` (default: one row affected, lastInsertId 1 per statement) or rejects with `error`.
 * @category Test helpers
 */
export function createRecordingInvoke(options: { results?: FakeResult[], error?: string } = {}) {
    const calls: FakeStatement[][] = []
    const invoke = vi.fn(async (command: string, args?: { statements?: FakeStatement[] }) => {
        if (command !== "db_transaction") throw new Error(`Unexpected command ${command}`)
        const statements = args?.statements ?? []
        calls.push(statements)
        if (options.error !== undefined) throw options.error
        return options.results ?? statements.map(() => ({ rowsAffected: 1, lastInsertId: 1 }))
    })
    return { invoke, calls }
}

// The part of node:sqlite's DatabaseSync used to answer queries (structural, like SqliteLike)
type SqliteQueryLike = {
    prepare(sql: string): {
        run(...params: never[]): { changes: number | bigint, lastInsertRowid: number | bigint }
        all(...params: never[]): unknown[]
    }
}

/**
 * Fake of the tauri-plugin-sql Database (`execute` / `select`) on a real node:sqlite database, read lazily on every call.
 * Use it in the factory of `vi.mock("../dbManager", ...)`:
 * `async () => { const { createSqliteDb } = await import("@/test/db-mock"); return { getDB: vi.fn(async () => createSqliteDb(() => sqlite)) } }`
 * @category Test helpers
 */
export function createSqliteDb(getSqlite: () => SqliteQueryLike) {
    return {
        execute: async (sql: string, params: unknown[] = []) => {
            const result = getSqlite().prepare(sql).run(...(params as never[]))
            return { rowsAffected: Number(result.changes), lastInsertId: Number(result.lastInsertRowid) }
        },
        select: async (sql: string, params: unknown[] = []) => getSqlite().prepare(sql).all(...(params as never[])),
    }
}

/**
 * A `rows(sql)` helper that reads rows straight from the test database (to assert on what the queries wrote).
 * @category Test helpers
 */
export function sqliteRows(getSqlite: () => SqliteQueryLike) {
    return (sql: string) => getSqlite().prepare(sql).all() as Record<string, unknown>[]
}
