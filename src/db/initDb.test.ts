// @vitest-environment node
/// <reference types="node" />
import { beforeEach, describe, expect, it, vi } from "vitest"
import { DatabaseSync, type SQLInputValue } from "node:sqlite"
import type Database from "@tauri-apps/plugin-sql"
import { createMockDb, type MockDb } from "@/test/db-mock"
import { initDB, legacyDbMessage, newerDbMessage } from "./initDb"
import { APPLICATION_ID, archiveSchema, initialSchema, latestSchema, taskArchiveSchema } from "./schema/initial"
import { automationSchema } from "./schema/automation"
import { addGroupColorColumn } from "./schema/section_group"
import { createWorkspaceEditTriggers } from "./schema/workspace_edit"

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

    it("sets user_version to 6 and the application id", () => {
        expect(pragma("user_version")).toBe(6)
        expect(pragma("application_id")).toBe(APPLICATION_ID)
    })

    it("creates the expected tables", () => {
        expect(names("table")).toEqual([
            "audio_file", "automation", "folder", "note", "note_template", "section", "section_group", "task", "workspace",
        ])
    })

    it("creates the expected indexes", () => {
        const explicit = names("index").filter(n => n.startsWith("idx_"))
        expect(explicit).toEqual([
            "idx_audio_file_group", "idx_automation_note",
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
            ...["audio_file", "folder", "note", "note_template", "section", "section_group", "task"]
                .flatMap(t => ["delete", "insert", "update"].map(e => `workspace_edit_on_${t}_${e}`)),
        ].sort())
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
        expect(pragma("user_version")).toBe(6)
    })

    it("does not execute anything when already at the latest version", async () => {
        const db: MockDb = createMockDb()
        db.select.mockResolvedValueOnce([{ user_version: 6 }]).mockResolvedValueOnce([{ application_id: APPLICATION_ID }])
        await initDB(db as unknown as Database)
        expect(db.execute).not.toHaveBeenCalled()
    })

    it("applies the initial schema and then bumps the version on a fresh database", async () => {
        const db: MockDb = createMockDb()
        db.select.mockResolvedValueOnce([{ user_version: 0 }])
        await initDB(db as unknown as Database)
        expect(db.execute.mock.calls.map(c => c[0])).toEqual([...initialSchema, "PRAGMA user_version = 1", addGroupColorColumn, "PRAGMA user_version = 2", ...createWorkspaceEditTriggers, "PRAGMA user_version = 3", ...archiveSchema, "PRAGMA user_version = 4", ...automationSchema, "PRAGMA user_version = 5", ...taskArchiveSchema, "PRAGMA user_version = 6"])
    })

    it("treats an empty PRAGMA result as a fresh database", async () => {
        const db: MockDb = createMockDb()
        db.select.mockResolvedValueOnce([])
        await initDB(db as unknown as Database)
        expect(db.execute.mock.calls.at(-1)?.[0]).toBe("PRAGMA user_version = 6")
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
        db.select.mockResolvedValueOnce([{ user_version: 7 }]).mockResolvedValueOnce([{ application_id: APPLICATION_ID }])
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

describe("initDB v2 (group color)", () => {
    const groupInfo = () => (sqlite.prepare("PRAGMA table_info(section_group)").all() as { name: string, notnull: number, dflt_value: unknown }[])
        .find(c => c.name === "color")

    // A real v1 database: the initial schema only, with data
    const makeV1 = () => {
        for (const q of initialSchema) sqlite.exec(q)
        sqlite.exec("PRAGMA user_version = 1")
        sqlite.exec(`INSERT INTO workspace (id, name) VALUES (1, 'WS');
            INSERT INTO note (id, workspaceID, name, position) VALUES (1, 1, 'N', 0);
            INSERT INTO section_group (id, noteID, position, name) VALUES (1, 1, 0, 'Idee')`)
    }

    it("adds a nullable color column with a non empty check on a new database", async () => {
        await initDB(adapter())
        expect(columns("section_group")).toContain("color")
        expect(groupInfo()).toMatchObject({ notnull: 0, dflt_value: "NULL" })
        sqlite.exec("INSERT INTO workspace (id, name) VALUES (1, 'WS'); INSERT INTO note (id, workspaceID, name, position) VALUES (1, 1, 'N', 0)")
        expect(() => sqlite.exec("INSERT INTO section_group (noteID, position, color) VALUES (1, 0, '')")).toThrow(/CHECK/)
        expect(() => sqlite.exec("INSERT INTO section_group (noteID, position, color) VALUES (1, 1, '#fff')")).not.toThrow()
    })

    it("migrates a real v1 database to v2 preserving its data and application id", async () => {
        makeV1()
        await initDB(adapter())
        expect(pragma("user_version")).toBe(6)
        expect(pragma("application_id")).toBe(APPLICATION_ID)
        expect(sqlite.prepare("SELECT id, name, color FROM section_group").all()).toEqual([{ id: 1, name: "Idee", color: null }])
        expect(sqlite.prepare("SELECT name FROM note").all()).toEqual([{ name: "N" }])
        expect(sqlite.prepare("PRAGMA foreign_key_check").all()).toEqual([])
    })

    it("a v1 and a fresh database end up with the same columns", async () => {
        makeV1()
        await initDB(adapter())
        expect(columns("section_group")).toEqual(["id", "noteID", "position", "deleted_at", "name", "color", "archived_at"])
    })

    it("retries safely when the column exists but the version was not bumped", async () => {
        makeV1()
        sqlite.exec("ALTER TABLE section_group ADD COLUMN color TEXT CHECK (LENGTH(color) > 0) DEFAULT NULL")
        await expect(initDB(adapter())).resolves.toBeUndefined()
        expect(pragma("user_version")).toBe(6)
    })

    it("still fails on other ALTER errors", async () => {
        const db: MockDb = createMockDb()
        db.select.mockResolvedValueOnce([{ user_version: 1 }]).mockResolvedValueOnce([{ application_id: APPLICATION_ID }])
        db.execute.mockRejectedValueOnce(new Error("disk full"))
        await expect(initDB(db as unknown as Database)).rejects.toThrow("disk full")
    })
})

describe("initDB v3 (workspace edit triggers)", () => {
    const setup = () => sqlite.exec(`
        INSERT INTO workspace (id, name) VALUES (1, 'WS'), (2, 'Other');
        INSERT INTO note (id, workspaceID, name, position) VALUES (1, 1, 'N', 0);
        INSERT INTO section_group (id, noteID, position) VALUES (1, 1, 0);
        INSERT INTO section (id, groupID, title, position) VALUES (1, 1, 'S', 0);
        INSERT INTO audio_file (name, section_groupID, path, position) VALUES ('a', 1, 'p', 0);
    `)
    const old = () => sqlite.exec("UPDATE workspace SET edit_date='2000-01-01', edit_time='00:00'")
    const edit = (id: number) => sqlite.prepare("SELECT edit_date d, edit_time t FROM workspace WHERE id = ?").get(id) as { d: string, t: string }
    const touched = (id: number) => edit(id).d !== "2000-01-01"

    it("insert, update, soft delete and delete of a task or subtask bump only the owning workspace", async () => {
        await initDB(adapter())
        setup()
        const steps = [
            "INSERT INTO task (id, sectionID, text) VALUES (1, 1, 't')",
            "INSERT INTO task (id, sectionID, taskID, text) VALUES (2, 1, 1, 'sub')",
            "UPDATE task SET text = 'x' WHERE id = 1",
            "UPDATE task SET deleted_at = '2025-01-01' WHERE id = 2",
            "DELETE FROM task WHERE id = 2",
        ]
        for (const q of steps) {
            old()
            sqlite.exec(q)
            expect(touched(1), q).toBe(true)
            expect(edit(1).t).toMatch(/^[0-9]{2}:[0-9]{2}$/)
            expect(touched(2), q).toBe(false)
        }
    })

    it("every table bumps its workspace", async () => {
        await initDB(adapter())
        setup()
        const qs = [
            "INSERT INTO folder (id, workspaceID, name, position) VALUES (1, 1, 'F', 0)",
            "UPDATE folder SET position = 3 WHERE id = 1",
            "DELETE FROM folder WHERE id = 1",
            "INSERT INTO note_template (id, workspaceID, name, content) VALUES (1, 1, 'T', '{}')",
            "UPDATE note_template SET deleted_at = '2025-01-01' WHERE id = 1",
            "DELETE FROM note_template WHERE id = 1",
            "UPDATE note SET position = 4 WHERE id = 1",
            "INSERT INTO section_group (noteID, position) VALUES (1, 1)",
            "UPDATE section_group SET position = 5 WHERE id = 1",
            "INSERT INTO section (groupID, title, position) VALUES (1, 'S2', 1)",
            "UPDATE section SET position = 2 WHERE id = 1",
            "INSERT INTO audio_file (name, section_groupID, path, position) VALUES ('b', 1, 'p', 1)",
            "UPDATE audio_file SET position = 7 WHERE name = 'a'",
            "DELETE FROM audio_file WHERE name = 'b'",
            "DELETE FROM section WHERE title = 'S2'",
            "DELETE FROM section_group WHERE position = 1",
        ]
        for (const q of qs) {
            old()
            sqlite.exec(q)
            expect(touched(1), q).toBe(true)
            expect(touched(2), q).toBe(false)
        }
    })

    it("moving a note to another workspace bumps both", async () => {
        await initDB(adapter())
        setup()
        old()
        sqlite.exec("UPDATE note SET workspaceID = 2 WHERE id = 1")
        expect(touched(1)).toBe(true)
        expect(touched(2)).toBe(true)
    })

    it("deleting a whole workspace (cascade) works", async () => {
        await initDB(adapter())
        setup()
        sqlite.exec("INSERT INTO task (sectionID, text) VALUES (1, 't')")
        expect(() => sqlite.exec("DELETE FROM workspace WHERE id = 1")).not.toThrow()
    })

    it("a v2 database gets the triggers once on migration", async () => {
        for (const q of [...initialSchema, addGroupColorColumn]) sqlite.exec(q)
        sqlite.exec("PRAGMA user_version = 2")
        await initDB(adapter())
        expect(pragma("user_version")).toBe(6)
        expect(names("trigger").filter(n => n.startsWith("workspace_edit_on_"))).toHaveLength(21)
    })
})

describe("initDB beforeMigrate", () => {
    const latest = 6

    it("is not called for a new database", async () => {
        const beforeMigrate = vi.fn()
        await initDB(adapter(), { beforeMigrate })
        expect(beforeMigrate).not.toHaveBeenCalled()
        expect(pragma("user_version")).toBe(latest)
    })

    it("is not called when the database is already up to date", async () => {
        await initDB(adapter())
        const beforeMigrate = vi.fn()
        await initDB(adapter(), { beforeMigrate })
        expect(beforeMigrate).not.toHaveBeenCalled()
    })

    it("is called once, before anything changes, for an existing database that needs migrating", async () => {
        sqlite.exec(`PRAGMA application_id = ${APPLICATION_ID}`)
        for (const query of initialSchema) sqlite.exec(query)
        sqlite.exec("PRAGMA user_version = 1")
        let versionSeen = -1
        const beforeMigrate = vi.fn(async () => { versionSeen = pragma("user_version") })
        const db = adapter()
        await initDB(db, { beforeMigrate })
        expect(beforeMigrate).toHaveBeenCalledTimes(1)
        expect(beforeMigrate).toHaveBeenCalledWith(db, 1, latest)
        expect(versionSeen).toBe(1)
        expect(pragma("user_version")).toBe(latest)
    })

    it("a rejection stops the migration", async () => {
        sqlite.exec(`PRAGMA application_id = ${APPLICATION_ID}`)
        for (const query of initialSchema) sqlite.exec(query)
        sqlite.exec("PRAGMA user_version = 1")
        await expect(initDB(adapter(), { beforeMigrate: async () => { throw new Error("no space") } })).rejects.toThrow("no space")
        expect(pragma("user_version")).toBe(1)
    })
})

describe("initDB v4 (archive)", () => {
    // A real v3 database with data, including the flags and the names that v4 has to deal with
    const makeV3 = () => {
        for (const q of [...initialSchema, addGroupColorColumn, ...createWorkspaceEditTriggers]) sqlite.exec(q)
        sqlite.exec("PRAGMA user_version = 3")
        sqlite.exec(`
            INSERT INTO workspace (id, name) VALUES (1, 'WS');
            INSERT INTO folder (id, workspaceID, name) VALUES (1, 1, 'F');
            INSERT INTO note (id, workspaceID, name, position) VALUES (1, 1, 'N', 0);
            INSERT INTO section_group (id, noteID, position, name) VALUES (1, 1, 0, 'G');
            INSERT INTO section (id, groupID, title, archived, position) VALUES (1, 1, 'S', 1, 0);
            INSERT INTO task (id, sectionID, text, archived) VALUES (1, 1, 'T', 1);
        `)
    }
    const sqlOf = (name: string) => (sqlite.prepare("SELECT sql FROM sqlite_master WHERE name = ?").get(name) as { sql: string }).sql

    it("adds archived_at to folder, note, section_group and section, and drops the old archived flags", async () => {
        makeV3()
        await initDB(adapter())
        expect(pragma("user_version")).toBe(6)
        for (const t of ["folder", "note", "section_group", "section"]) expect(columns(t)).toContain("archived_at")
        // The old `archived` flag is gone; v6 adds the archive date to the tasks
        expect(columns("task")).not.toContain("archived")
        expect(columns("task")).toContain("archived_at")
        expect(columns("section")).not.toContain("archived")
        expect(columns("task")).not.toContain("archived")
        expect(sqlite.prepare("SELECT archived_at FROM section").all()).toEqual([{ archived_at: null }])
    })

    it("keeps the data, the foreign keys and the application id", async () => {
        makeV3()
        await initDB(adapter())
        expect(sqlite.prepare("SELECT title FROM section").all()).toEqual([{ title: "S" }])
        expect(sqlite.prepare("SELECT text FROM task").all()).toEqual([{ text: "T" }])
        expect(sqlite.prepare("SELECT name FROM folder").all()).toEqual([{ name: "F" }])
        expect(sqlite.prepare("PRAGMA foreign_key_check").all()).toEqual([])
        expect(pragma("application_id")).toBe(APPLICATION_ID)
    })

    it("recreates the edit triggers without the removed column and they still work", async () => {
        makeV3()
        await initDB(adapter())
        expect(sqlOf("update_section_edit_timestamp")).not.toMatch(/archived/)
        expect(sqlOf("update_task_edit_timestamp")).not.toMatch(/archived/)
        for (const [table, set] of [["section", "title = 'X'"], ["task", "text = 'X'"]] as const) {
            sqlite.exec(`UPDATE ${table} SET edit_date = '2000-01-01', edit_time = '00:00'`)
            sqlite.exec(`UPDATE ${table} SET ${set}`)
            expect(sqlite.prepare(`SELECT edit_date FROM ${table}`).get(), table).not.toEqual({ edit_date: "2000-01-01" })
        }
        // archiving is not a content edit
        sqlite.exec("UPDATE section SET edit_date = '2000-01-01'")
        sqlite.exec("UPDATE section SET archived_at = datetime('now')")
        expect(sqlite.prepare("SELECT edit_date FROM section").get()).toEqual({ edit_date: "2000-01-01" })
    })

    it("keeps the workspace edit triggers (the workspace is touched when something is archived)", async () => {
        makeV3()
        await initDB(adapter())
        sqlite.exec("UPDATE workspace SET edit_date = '2000-01-01'")
        sqlite.exec("UPDATE note SET archived_at = datetime('now')")
        expect(sqlite.prepare("SELECT edit_date FROM workspace").get()).not.toEqual({ edit_date: "2000-01-01" })
    })

    it("the unique names ignore the archived (and trashed) items", async () => {
        await initDB(adapter())
        sqlite.exec(`INSERT INTO workspace (id, name) VALUES (1, 'WS');
            INSERT INTO folder (id, workspaceID, name) VALUES (1, 1, 'A');
            INSERT INTO note (id, workspaceID, name) VALUES (1, 1, 'A');
            INSERT INTO section_group (id, noteID, position) VALUES (1, 1, 0);
            INSERT INTO section (id, groupID, title) VALUES (1, 1, 'A')`)
        const inserts = [
            "INSERT INTO folder (workspaceID, name) VALUES (1, 'A')",
            "INSERT INTO note (workspaceID, name) VALUES (1, 'A')",
            "INSERT INTO section (groupID, title) VALUES (1, 'A')",
        ]
        for (const q of inserts) expect(() => sqlite.exec(q), q).toThrow(/UNIQUE/)
        for (const t of ["folder", "note", "section"]) sqlite.exec(`UPDATE ${t} SET archived_at = datetime('now') WHERE id = 1`)
        for (const q of inserts) expect(() => sqlite.exec(q), q).not.toThrow()
        // the unarchive conflicts with the new live item
        for (const t of ["folder", "note", "section"])
            expect(() => sqlite.exec(`UPDATE ${t} SET archived_at = NULL WHERE id = 1`), t).toThrow(/UNIQUE/)
    })

    it("a migrated and a fresh database have the same schema", async () => {
        await initDB(adapter())
        const fresh = sqlite.prepare("SELECT type, name, sql FROM sqlite_master ORDER BY type, name").all()
        sqlite = new DatabaseSync(":memory:")
        sqlite.exec("PRAGMA foreign_keys=ON")
        makeV3()
        await initDB(adapter())
        expect(sqlite.prepare("SELECT type, name, sql FROM sqlite_master ORDER BY type, name").all()).toEqual(fresh)
    })

    it("latestSchema builds the same schema as the migrations", async () => {
        await initDB(adapter())
        const migrated = sqlite.prepare("SELECT type, name FROM sqlite_master ORDER BY type, name").all()
        sqlite = new DatabaseSync(":memory:")
        for (const q of latestSchema) sqlite.exec(q)
        expect(sqlite.prepare("SELECT type, name FROM sqlite_master ORDER BY type, name").all()).toEqual(migrated)
        expect(columns("section")).toContain("archived_at")
        expect(columns("section")).not.toContain("archived")
    })

    it("retries safely when a previous run was interrupted after dropping the columns", async () => {
        makeV3()
        sqlite.exec("DROP TRIGGER update_section_edit_timestamp; DROP TRIGGER update_task_edit_timestamp")
        sqlite.exec("ALTER TABLE section ADD COLUMN archived_at TEXT DEFAULT NULL")
        sqlite.exec("ALTER TABLE section DROP COLUMN archived")
        sqlite.exec("ALTER TABLE task DROP COLUMN archived")
        await expect(initDB(adapter())).resolves.toBeUndefined()
        expect(pragma("user_version")).toBe(6)
        expect(names("trigger")).toContain("update_task_edit_timestamp")
        expect(names("trigger")).toContain("update_section_edit_timestamp")
        expect(columns("folder")).toContain("archived_at")
    })
})
