// @vitest-environment node
/// <reference types="node" />
import { beforeEach, describe, expect, it, vi } from "vitest"
import { DatabaseSync, type SQLInputValue } from "node:sqlite"
import type Database from "@tauri-apps/plugin-sql"
import { createMockDb, type MockDb } from "@/test/db-mock"
import { initDB, legacyDbMessage, newerDbMessage } from "./initDb"
import { APPLICATION_ID, initialSchema } from "./schema/initial"

// Runs initDB against a real SQLite database through a minimal adapter of the plugin API
let sqlite: DatabaseSync

function adapter(): Database {
    return {
        select: async (sql: string, params: SQLInputValue[] = []) => sqlite.prepare(sql).all(...params),
        execute: async (sql: string) => {
            sqlite.exec(sql)
            return { rowsAffected: 0, lastInsertId: 0 }
        },
    } as unknown as Database
}

const names = (type: "table" | "index" | "trigger") =>
    (sqlite.prepare("SELECT name FROM sqlite_master WHERE type = ? AND name NOT LIKE 'sqlite_%' ORDER BY name").all(type) as { name: string }[])
        .map(r => r.name)

const pragma = (name: string) => (sqlite.prepare(`PRAGMA ${name}`).get() as Record<string, number>)[name]

const columns = (table: string) =>
    (sqlite.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map(c => c.name)

beforeEach(() => {
    sqlite = new DatabaseSync(":memory:")
    sqlite.exec("PRAGMA foreign_keys=ON")
    vi.spyOn(console, "error").mockImplementation(() => undefined)
})

describe("initDB final schema", () => {
    beforeEach(async () => {
        await initDB(adapter())
    })

    it("sets user_version to 1 and the application id", () => {
        expect(pragma("user_version")).toBe(1)
        expect(pragma("application_id")).toBe(APPLICATION_ID)
    })

    it("creates the expected tables", () => {
        expect(names("table")).toEqual([
            "audio_file", "folder", "note", "note_template", "section", "section_group", "task", "workspace",
        ])
    })

    it("creates the expected indexes", () => {
        const explicit = names("index").filter(n => n.startsWith("idx_"))
        expect(explicit).toEqual([
            "idx_audio_file_group",
            "idx_folder_name", "idx_folder_parent", "idx_folder_workspace_parent",
            "idx_note_name", "idx_note_parent", "idx_note_template_name", "idx_note_template_source",
            "idx_note_template_workspace", "idx_note_workspace_parent",
            "idx_section_group_note", "idx_section_parent", "idx_section_title",
            "idx_task_parent", "idx_task_section",
            "idx_workspace_name",
        ])
    })

    it("creates the edit timestamp triggers", () => {
        expect(names("trigger")).toEqual([
            "update_folder_edit_timestamp", "update_note_edit_timestamp", "update_note_template_edit_timestamp",
            "update_section_edit_timestamp", "update_task_edit_timestamp", "update_workspace_edit_timestamp",
        ])
    })

    it("has the soft delete and ordering columns", () => {
        for (const t of ["workspace", "folder", "note", "section_group", "section", "task", "audio_file", "note_template"])
            expect(columns(t)).toContain("deleted_at")
        for (const t of ["folder", "note", "section_group", "section", "task", "audio_file"])
            expect(columns(t)).toContain("position")
        expect(columns("section_group")).toContain("name")
    })

    it("allows the name of a trashed item to be reused but not a duplicate among live ones", () => {
        sqlite.exec("INSERT INTO workspace (id, name) VALUES (1, 'WS')")
        expect(() => sqlite.exec("INSERT INTO workspace (name) VALUES ('WS')")).toThrow(/UNIQUE/)
        sqlite.exec("UPDATE workspace SET deleted_at = '2024-01-01' WHERE id = 1")
        expect(() => sqlite.exec("INSERT INTO workspace (name) VALUES ('WS')")).not.toThrow()
    })

    it("updates the edit timestamp only when a content column changes", () => {
        sqlite.exec("INSERT INTO workspace (id, name, edit_date, edit_time) VALUES (1, 'WS', '2000-01-01', '00:00')")
        sqlite.exec("UPDATE workspace SET deleted_at = '2024-01-01' WHERE id = 1")
        expect(sqlite.prepare("SELECT edit_date FROM workspace").get()).toEqual({ edit_date: "2000-01-01" })
        sqlite.exec("UPDATE workspace SET name = 'Renamed' WHERE id = 1")
        expect(sqlite.prepare("SELECT edit_date FROM workspace").get()).not.toEqual({ edit_date: "2000-01-01" })
    })

    it("has consistent foreign keys", () => {
        expect(sqlite.prepare("PRAGMA foreign_key_check").all()).toEqual([])
    })
})

describe("initDB behaviour", () => {
    it("is idempotent when called twice", async () => {
        await initDB(adapter())
        const snapshot = sqlite.prepare("SELECT type, name, sql FROM sqlite_master ORDER BY name").all()
        sqlite.exec("INSERT INTO workspace (id, name) VALUES (1, 'WS')")
        await initDB(adapter())
        expect(sqlite.prepare("SELECT type, name, sql FROM sqlite_master ORDER BY name").all()).toEqual(snapshot)
        expect(sqlite.prepare("SELECT name FROM workspace").all()).toEqual([{ name: "WS" }])
        expect(pragma("user_version")).toBe(1)
    })

    it("does not execute anything when already at the latest version", async () => {
        const db: MockDb = createMockDb()
        db.select.mockResolvedValueOnce([{ user_version: 1 }]).mockResolvedValueOnce([{ application_id: APPLICATION_ID }])
        await initDB(db as unknown as Database)
        expect(db.execute).not.toHaveBeenCalled()
    })

    it("applies the initial schema and then bumps the version on a fresh database", async () => {
        const db: MockDb = createMockDb()
        db.select.mockResolvedValueOnce([{ user_version: 0 }])
        await initDB(db as unknown as Database)
        expect(db.execute.mock.calls.map(c => c[0])).toEqual([...initialSchema, "PRAGMA user_version = 1"])
    })

    it("treats an empty PRAGMA result as a fresh database", async () => {
        const db: MockDb = createMockDb()
        db.select.mockResolvedValueOnce([])
        await initDB(db as unknown as Database)
        expect(db.execute.mock.calls.at(-1)?.[0]).toBe("PRAGMA user_version = 1")
    })

    it("refuses a legacy database (user_version > 0 without the application id) and leaves it untouched", async () => {
        for (const version of [1, 2, 8]) {
            const db: MockDb = createMockDb()
            db.select.mockResolvedValueOnce([{ user_version: version }]).mockResolvedValueOnce([{ application_id: 0 }])
            await expect(initDB(db as unknown as Database)).rejects.toThrow(legacyDbMessage())
            expect(db.execute).not.toHaveBeenCalled()
        }
    })

    it("refuses a real legacy database file without modifying it", async () => {
        sqlite.exec("CREATE TABLE workspace (id INTEGER PRIMARY KEY, name TEXT); PRAGMA user_version = 8")
        await expect(initDB(adapter())).rejects.toThrow(/elimina il file/)
        expect(names("table")).toEqual(["workspace"])
        expect(pragma("user_version")).toBe(8)
    })

    it("refuses a database of a newer version", async () => {
        const db: MockDb = createMockDb()
        db.select.mockResolvedValueOnce([{ user_version: 2 }]).mockResolvedValueOnce([{ application_id: APPLICATION_ID }])
        await expect(initDB(db as unknown as Database)).rejects.toThrow(newerDbMessage())
        expect(db.execute).not.toHaveBeenCalled()
    })

    it("rethrows on failure and does not bump the version", async () => {
        const err = new Error("syntax error")
        const db: MockDb = createMockDb()
        db.select.mockResolvedValueOnce([{ user_version: 0 }])
        db.execute.mockImplementation(async (q: unknown) => {
            if (q === initialSchema[2]) throw err
            return { rowsAffected: 0, lastInsertId: 0 }
        })
        await expect(initDB(db as unknown as Database)).rejects.toBe(err)
        expect(db.execute.mock.calls.some(c => String(c[0]).startsWith("PRAGMA user_version ="))).toBe(false)
        expect(console.error).toHaveBeenCalled()
    })

    it("propagates a failing PRAGMA read", async () => {
        const db: MockDb = createMockDb()
        db.select.mockRejectedValueOnce(new Error("no pragma"))
        await expect(initDB(db as unknown as Database)).rejects.toThrow("no pragma")
        expect(db.execute).not.toHaveBeenCalled()
    })
})
