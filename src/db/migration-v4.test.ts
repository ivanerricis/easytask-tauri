// @vitest-environment node
/// <reference types="node" />
import { beforeEach, describe, expect, it } from "vitest"
import { DatabaseSync } from "node:sqlite"
import { createTableAudioFile } from "./schema/audio_file"
import { createFolderTable, createFolderTrigger } from "./schema/folder"
import { createNoteTable, createNoteTrigger } from "./schema/note"
import { createSectionTable, createSectionTrigger } from "./schema/section"
import { createSectionGroupTable } from "./schema/section_group"
import { createTaskTable, createTaskTrigger } from "./schema/task"
import { createWorkspaceTable, createWorkspaceTrigger } from "./schema/workspace"
import { migrateToV3 } from "./schema/v3"
import { migrateToV4 } from "./schema/v4"

// Runs the real migrations (v1 -> v4) against a real SQLite database
let db: DatabaseSync

const all = (sql: string) => db.prepare(sql).all() as Record<string, unknown>[]

beforeEach(() => {
    db = new DatabaseSync(":memory:")
    db.exec("PRAGMA foreign_keys=ON")
    for (const sql of [
        createWorkspaceTable, createFolderTable, createNoteTable, createSectionGroupTable,
        createSectionTable, createTaskTable, createTableAudioFile,
        createWorkspaceTrigger, createFolderTrigger, createNoteTrigger, createSectionTrigger, createTaskTrigger,
    ]) db.exec(sql)
    db.exec(`
        INSERT INTO workspace (id, name) VALUES (1, 'WS');
        INSERT INTO note (id, workspaceID, name) VALUES (1, 1, 'N');
        INSERT INTO section_group (id, noteID, position) VALUES (1, 1, 0), (2, 1, 1);
        INSERT INTO section (id, groupID, title) VALUES (1, 1, 'A'), (2, 1, 'B'), (3, 2, 'C'), (4, 1, 'D');
        INSERT INTO task (id, sectionID, taskID, text) VALUES
            (1, 1, NULL, 'T1'), (2, 1, NULL, 'T2'), (3, NULL, 1, 'Sub1'), (4, NULL, 1, 'Sub2'), (5, 2, NULL, 'T5');
    `)
    db.exec(migrateToV3)
    db.exec(migrateToV4)
})

describe("migration v4", () => {
    it("bumps user_version and keeps foreign keys enabled", () => {
        expect(all("PRAGMA user_version")[0].user_version).toBe(4)
        expect(all("PRAGMA foreign_keys")[0].foreign_keys).toBe(1)
    })

    it("numbers the sections per group following the id order", () => {
        expect(all("SELECT id, position FROM section ORDER BY id"))
            .toEqual([{ id: 1, position: 0 }, { id: 2, position: 1 }, { id: 3, position: 0 }, { id: 4, position: 2 }])
    })

    it("numbers the tasks per section and parent following the id order", () => {
        expect(all("SELECT id, position FROM task ORDER BY id"))
            .toEqual([{ id: 1, position: 0 }, { id: 2, position: 1 }, { id: 3, position: 0 }, { id: 4, position: 1 }, { id: 5, position: 0 }])
    })

    it("new rows default to position 0", () => {
        db.exec("INSERT INTO section (groupID, title) VALUES (2, 'E')")
        expect(all("SELECT position FROM section WHERE title = 'E'")[0].position).toBe(0)
    })

    it("does not touch the edit timestamp when only the position changes", () => {
        db.exec("UPDATE section SET edit_date = '2000-01-01', edit_time = '00:00'")
        db.exec("UPDATE section SET position = 9 WHERE id = 1")
        db.exec("UPDATE task SET edit_date = '2000-01-01', edit_time = '00:00'")
        db.exec("UPDATE task SET position = 9 WHERE id = 1")
        expect(all("SELECT edit_date FROM section WHERE id = 1")[0].edit_date).toBe("2000-01-01")
        expect(all("SELECT edit_date FROM task WHERE id = 1")[0].edit_date).toBe("2000-01-01")
    })

    it("has no foreign key violations", () => {
        expect(all("PRAGMA foreign_key_check")).toEqual([])
    })
})
