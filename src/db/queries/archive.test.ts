// @vitest-environment node
/// <reference types="node" />
import { beforeEach, describe, expect, it, vi } from "vitest"
import { DatabaseSync, type SQLInputValue } from "node:sqlite"
import { latestSchema } from "../schema/initial"

// These tests run the real query SQL against a real SQLite database (schema migrated to v4)
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

// db_transaction runs on the same in-memory database, with real BEGIN/COMMIT/ROLLBACK; every audio file exists
vi.mock("@tauri-apps/api/core", async () => {
    const { createSqliteInvoke } = await import("@/test/db-mock")
    const sqliteInvoke = createSqliteInvoke(() => sqlite)
    return {
        invoke: vi.fn(async (command: string, args?: never) =>
            command === "audio_file_exists" ? true : sqliteInvoke(command, args)),
    }
})

import { archiveDBItem, getDBArchive, getDBArchiveCount, unarchiveDBItem } from "./archive"
import { getDBNoteData } from "./note"
import { getDBWorkspaceData } from "./workspace"
import { getDBGroupAudioFiles, getDBNoteAudioFiles } from "./audio"
import { getDBTrash, restoreDBItem } from "./trash"
import { deleteDBItem } from "./shared_queries"
import { moveDBSection, moveDBSectionToNewGroup, moveDBTask } from "./move"
import { moveDBTreeItem } from "./tree"
import { createDBNoteFromTemplate, createDBTemplateFromNote, getDBTemplates } from "./template"
import { duplicateDBNote } from "./duplicate"
import { buildDBItemExport, buildDBWorkspaceExport, importDBItems, importDBWorkspace, validateWorkspaceExport } from "./transfer"
import type { ArchiveItemType } from "@/types/types"

const rows = (sql: string) => sqlite.prepare(sql).all() as Record<string, unknown>[]
const archivedAt = (table: string, id: number) => (rows(`SELECT archived_at FROM ${table} WHERE id = ${id}`)[0].archived_at as string | null)
const keys = (items: { type: string, id: number }[]) => items.map(i => `${i.type}${i.id}`).sort()

async function thrown(p: Promise<unknown>): Promise<unknown> {
    try {
        await p
    } catch (e) {
        return e
    }
    throw new Error("expected rejection")
}

beforeEach(() => {
    sqlite = new DatabaseSync(":memory:")
    sqlite.exec("PRAGMA foreign_keys=ON")
    for (const sql of latestSchema) sqlite.exec(sql)
    sqlite.exec(`
        INSERT INTO workspace (id, name) VALUES (1, 'WS'), (2, 'Other');
        INSERT INTO folder (id, workspaceID, folderID, name, position) VALUES (1, 1, NULL, 'Docs', 0), (2, 1, 1, 'Sub', 0);
        INSERT INTO note (id, workspaceID, folderID, name, position) VALUES
            (1, 1, NULL, 'Root', 0), (2, 1, 1, 'InDocs', 0), (3, 1, 2, 'InSub', 0);
        INSERT INTO section_group (id, noteID, position, name) VALUES (1, 1, 0, 'Sprint'), (2, 1, 1, NULL), (3, 2, 0, 'Other');
        INSERT INTO section (id, groupID, title, position) VALUES (1, 1, 'A', 0), (2, 1, 'B', 1), (3, 2, 'C', 0), (4, 3, 'D', 0);
        INSERT INTO task (id, sectionID, taskID, text, position) VALUES
            (1, 1, NULL, 'T1', 0), (2, 2, NULL, 'T2', 0), (3, 2, 2, 'T2 child', 0), (4, 3, NULL, 'T4', 0), (5, 4, NULL, 'T5', 0);
        INSERT INTO audio_file (id, section_groupID, name, path, position) VALUES (1, 1, 'a.mp3', '/x/a.mp3', 0), (2, 2, 'b.mp3', '/x/b.mp3', 0);
    `)
})

describe("archiveDBItem / unarchiveDBItem", () => {
    it("marks only the item itself, with a date, and unarchive clears it", async () => {
        await archiveDBItem("section_group", 1)
        expect(archivedAt("section_group", 1)).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
        expect(rows("SELECT COUNT(*) AS n FROM section WHERE archived_at IS NOT NULL")[0].n).toBe(0)
        expect(rows("SELECT COUNT(*) AS n FROM task WHERE deleted_at IS NOT NULL")[0].n).toBe(0)
        await unarchiveDBItem("section_group", 1)
        expect(archivedAt("section_group", 1)).toBeNull()
    })

    it("archives folders, notes, groups and sections, and rejects any other type", async () => {
        for (const [type, id] of [["folder", 1], ["note", 1], ["section_group", 2], ["section", 2]] as const) {
            await archiveDBItem(type, id)
            expect(archivedAt(type, id), type).not.toBeNull()
        }
        expect(await thrown(archiveDBItem("task" as ArchiveItemType, 1))).toMatchObject({ code: "INVALID_ITEM_TYPE" })
        expect(await thrown(unarchiveDBItem("audio_file" as ArchiveItemType, 1))).toMatchObject({ code: "INVALID_ITEM_TYPE" })
        expect(await thrown(archiveDBItem("note; DROP TABLE note" as ArchiveItemType, 1))).toMatchObject({ code: "INVALID_ITEM_TYPE" })
    })

    it("does not touch an item that is already archived or in the trash", async () => {
        await archiveDBItem("note", 1)
        sqlite.exec("UPDATE note SET archived_at = '2000-01-01 00:00:00' WHERE id = 1")
        await archiveDBItem("note", 1)
        expect(archivedAt("note", 1)).toBe("2000-01-01 00:00:00")
        await deleteDBItem("note", 2)
        await archiveDBItem("note", 2)
        expect(archivedAt("note", 2)).toBeNull()
    })

    it("unarchiving an item brings back its archived ancestors too, but not the others", async () => {
        sqlite.exec(`UPDATE folder SET archived_at = '2024-01-01 00:00:00' WHERE id IN (1, 2);
            UPDATE note SET archived_at = '2024-01-01 00:00:00' WHERE id IN (2, 3);
            UPDATE section_group SET archived_at = '2024-01-01 00:00:00' WHERE id = 3;
            UPDATE section SET archived_at = '2024-01-01 00:00:00' WHERE id = 4`)
        await unarchiveDBItem("section", 4)
        expect([1, 2].map(id => archivedAt("folder", id))).toEqual([null, '2024-01-01 00:00:00'])
        expect(archivedAt("note", 2)).toBeNull()
        expect(archivedAt("section_group", 3)).toBeNull()
        expect(archivedAt("section", 4)).toBeNull()
        // not an ancestor of the section: still archived
        expect(archivedAt("note", 3)).not.toBeNull()

        await unarchiveDBItem("note", 3)
        expect(archivedAt("folder", 2)).toBeNull()
        expect(archivedAt("note", 3)).toBeNull()
    })

    it("unarchiving a folder brings back its archived ancestor folders only", async () => {
        sqlite.exec("UPDATE folder SET archived_at = '2024-01-01 00:00:00'; UPDATE note SET archived_at = '2024-01-01 00:00:00' WHERE id = 3")
        await unarchiveDBItem("folder", 2)
        expect([1, 2].map(id => archivedAt("folder", id))).toEqual([null, null])
        expect(archivedAt("note", 3)).not.toBeNull()
    })

    it("a name clash stops the unarchive with the restore message and leaves the ancestors archived", async () => {
        await archiveDBItem("folder", 1)
        await archiveDBItem("note", 2)
        sqlite.exec("INSERT INTO note (workspaceID, folderID, name) VALUES (1, 1, 'InDocs')")
        const error = await thrown(unarchiveDBItem("note", 2))
        expect(error).toMatchObject({ code: "NOTE_EXISTS" })
        expect((error as { message: string }).message).toMatch(/nome|name/i)
        expect(archivedAt("note", 2)).not.toBeNull()
        // the chain is not left half unarchived
        expect(archivedAt("folder", 1)).not.toBeNull()
    })

    it("a section title clash is reported the same way", async () => {
        await archiveDBItem("section", 1)
        sqlite.exec("INSERT INTO section (groupID, title) VALUES (1, 'A')")
        expect(await thrown(unarchiveDBItem("section", 1))).toMatchObject({ code: "SECTION_EXISTS" })
        expect(archivedAt("section", 1)).not.toBeNull()
    })
})

describe("readers", () => {
    it("getDBNoteData hides archived groups and sections with their tasks, unless asked", async () => {
        await archiveDBItem("section_group", 2)
        await archiveDBItem("section", 2)
        const data = await getDBNoteData(1)
        expect(data.groups.map(g => g.id)).toEqual([1])
        expect(data.sections.map(s => s.id)).toEqual([1])
        expect(data.tasks.map(t => t.id)).toEqual([1])

        const all = await getDBNoteData(1, true)
        expect(all.groups.map(g => g.id)).toEqual([1, 2])
        expect(all.sections.map(s => s.id)).toEqual([1, 3, 2])
        expect(all.tasks.map(t => t.id).sort()).toEqual([1, 2, 3, 4])
        expect(all.groups[1].archived_at).toBeTruthy()
    })

    it("an archived group hides the sections of the group and their tasks", async () => {
        await archiveDBItem("section_group", 1)
        const data = await getDBNoteData(1)
        expect(data.sections.map(s => s.id)).toEqual([3])
        expect(data.tasks.map(t => t.id)).toEqual([4])
    })

    it("getDBWorkspaceData hides archived folders and notes", async () => {
        await archiveDBItem("folder", 2)
        await archiveDBItem("note", 1)
        const data = await getDBWorkspaceData(1)
        expect(data.folders.map(f => f.id)).toEqual([1])
        // the note inside the archived folder is not hidden by the query: the tree builders drop it as an orphan
        expect(data.notes.map(n => n.id)).toEqual([2, 3])
    })

    it("the audio of an archived group is not listed", async () => {
        await archiveDBItem("section_group", 1)
        expect(Object.keys(await getDBNoteAudioFiles(1))).toEqual(["2"])
        expect(await getDBGroupAudioFiles(1)).toEqual([])
        expect((await getDBGroupAudioFiles(2)).map(f => f.name)).toEqual(["b.mp3"])
    })
})

describe("destinations", () => {
    it("nothing can be moved into an archived folder", async () => {
        await archiveDBItem("folder", 2)
        expect(await thrown(moveDBTreeItem("note", 1, 2, 0))).toMatchObject({ code: "FOLDER_MOVE_INVALID" })
        await moveDBTreeItem("note", 1, 1, 0)
        expect(rows("SELECT folderID FROM note WHERE id = 1")[0].folderID).toBe(1)
    })

    it("nothing can be moved into an archived group or section", async () => {
        await archiveDBItem("section_group", 2)
        expect(await thrown(moveDBSection(1, 2, 0))).toMatchObject({ code: "SECTION_MOVE_INVALID" })
        await archiveDBItem("section", 2)
        expect(await thrown(moveDBTask(1, { sectionId: 2, parentTaskId: null }, 0))).toMatchObject({ code: "TASK_MOVE_INVALID" })
        // a section can still go to a new group
        expect(await moveDBSectionToNewGroup(1, 0)).toBeGreaterThan(0)
    })
})

describe("templates and duplicates copy only what is visible", () => {
    beforeEach(async () => {
        await archiveDBItem("section_group", 2)
        await archiveDBItem("section", 2)
    })

    it("a template does not contain archived groups and sections", async () => {
        await createDBTemplateFromNote(1, "T")
        const [template] = await getDBTemplates(1)
        expect(template.content.groups).toHaveLength(1)
        expect(template.content.groups[0].sections.map(s => s.title)).toEqual(["A"])
        expect(JSON.stringify(template.content)).not.toContain("archived")
        const noteId = await createDBNoteFromTemplate(template.id, 1, null, "From template")
        expect(rows(`SELECT COUNT(*) AS n FROM section_group WHERE noteID = ${noteId} AND archived_at IS NOT NULL`)[0].n).toBe(0)
    })

    it("a template saved with the old archived flags is still applied (the flags are ignored)", async () => {
        const content = { version: 1, groups: [{ name: "G", position: 0, sections: [{ title: "S", color: null, archived: true, position: 0, tasks: [
            { text: "T", description: null, completed: false, priority: false, archived: true, color: null, position: 0, subtasks: [] }] }] }] }
        sqlite.prepare("INSERT INTO note_template (id, workspaceID, name, content) VALUES (9, 1, 'Old', ?)").run(JSON.stringify(content))
        const noteId = await createDBNoteFromTemplate(9, 1, null, "Old applied")
        expect(rows(`SELECT s.title, s.archived_at FROM section s JOIN section_group g ON g.id = s.groupID WHERE g.noteID = ${noteId}`))
            .toEqual([{ title: "S", archived_at: null }])
    })

    it("duplicating a note copies the visible content only", async () => {
        const copy = await duplicateDBNote(1)
        const data = await getDBNoteData(copy, true)
        expect(data.groups).toHaveLength(1)
        expect(data.sections.map(s => s.title)).toEqual(["A"])
    })
})

describe("getDBArchive / getDBArchiveCount", () => {
    it("lists the archived items with name, context and summary, most recent first, and the count matches", async () => {
        sqlite.exec(`UPDATE section SET archived_at = '2024-01-01 10:00:00' WHERE id = 2;
            UPDATE section_group SET archived_at = '2024-01-02 10:00:00' WHERE id = 2;
            UPDATE note SET archived_at = '2024-01-03 10:00:00' WHERE id = 3;
            UPDATE folder SET archived_at = '2024-01-04 10:00:00' WHERE id = 2`)
        const items = await getDBArchive(1)
        expect(items.map(i => [i.type, i.id])).toEqual([["folder", 2], ["note", 3], ["section_group", 2], ["section", 2]])
        const byType = Object.fromEntries(items.map(i => [i.type, i]))
        expect(byType.folder).toMatchObject({ name: "Sub", context: "Docs", archived_at: "2024-01-04 10:00:00" })
        expect(byType.folder.summary).toMatch(/1/)
        expect(byType.note).toMatchObject({ name: "InSub", context: "Sub" })
        expect(byType.section_group.name).not.toBe("")
        expect(byType.section_group).toMatchObject({ context: "Root" })
        expect(byType.section).toMatchObject({ name: "B" })
        expect(byType.section.context).toMatch(/Root/)
        expect(byType.section.summary).toMatch(/2/)
        expect(await getDBArchiveCount(1)).toBe(items.length)
        expect(await getDBArchive(2)).toEqual([])
        expect(await getDBArchiveCount(2)).toBe(0)
    })

    it("names an archived named group with its name and an unnamed one like the trash does", async () => {
        await archiveDBItem("section_group", 1)
        await archiveDBItem("section_group", 2)
        const items = await getDBArchive(1)
        expect(items.find(i => i.id === 1)?.name).toBe("Sprint")
        expect(items.find(i => i.id === 2)?.name).toMatch(/1/)
    })

    it("leaves out the items in the trash and the ones under a trashed ancestor", async () => {
        for (const [type, id] of [["note", 1], ["note", 3], ["section_group", 1], ["section", 3], ["folder", 2]] as const)
            await archiveDBItem(type, id)
        expect(keys(await getDBArchive(1))).toEqual(["folder2", "note1", "note3", "section3", "section_group1"])
        // a trashed folder hides what is archived inside it
        await deleteDBItem("folder", 1)
        expect(keys(await getDBArchive(1))).toEqual(["note1", "section3", "section_group1"])
        await restoreDBItem("folder", 1)
        // a trashed note hides its archived groups and sections
        await deleteDBItem("note", 1)
        expect(keys(await getDBArchive(1))).toEqual(["folder2", "note3"])
        expect(await getDBArchiveCount(1)).toBe(2)
    })

    it("an archived item moved to the trash leaves the archive, shows in the trash and comes back archived", async () => {
        await archiveDBItem("note", 2)
        await archiveDBItem("section", 4)
        expect(await getDBArchiveCount(1)).toBe(2)

        // the archived section inside the trashed note is hidden with it
        await deleteDBItem("note", 2)
        expect(await getDBArchive(1)).toEqual([])
        expect(await getDBArchiveCount(1)).toBe(0)
        expect(keys(await getDBTrash(1))).toEqual(["note2"])

        await restoreDBItem("note", 2)
        expect(archivedAt("note", 2)).not.toBeNull()
        expect(await getDBArchiveCount(1)).toBe(2)
        expect(await getDBTrash(1)).toEqual([])
    })
})

describe("export and import", () => {
    beforeEach(async () => {
        await archiveDBItem("folder", 2)
        await archiveDBItem("note", 2)
        await archiveDBItem("section_group", 2)
        await archiveDBItem("section", 2)
    })

    it("the workspace export includes the archived items with their archive date", async () => {
        const data = await buildDBWorkspaceExport(1)
        expect(data.folders.map(f => [f.name, !!f.archived_at])).toEqual([["Docs", false], ["Sub", true]])
        expect(data.notes.map(n => [n.name, !!n.archived_at])).toEqual([["Root", false], ["InDocs", true], ["InSub", false]])
        const groups = data.notes[0].content.groups
        expect(groups.map(g => !!g.archived_at)).toEqual([false, true])
        expect(groups[0].sections.map(s => [s.title, !!s.archived_at])).toEqual([["A", false], ["B", true]])
        expect(groups[1].sections[0].tasks.map(t => t.text)).toEqual(["T4"])
        expect(JSON.stringify(data)).not.toContain('"archived":')
    })

    it("importing it again keeps everything archived", async () => {
        const data = validateWorkspaceExport(JSON.parse(JSON.stringify(await buildDBWorkspaceExport(1))))
        const { workspaceId } = await importDBWorkspace(data)
        expect(workspaceId).not.toBe(1)
        expect(await getDBArchiveCount(workspaceId)).toBe(await getDBArchiveCount(1))
        expect((await getDBArchive(workspaceId)).map(i => [i.type, i.name])).toEqual((await getDBArchive(1)).map(i => [i.type, i.name]))
        expect(rows(`SELECT archived_at FROM folder WHERE workspaceID = ${workspaceId} AND name = 'Sub'`)[0].archived_at).toBe(archivedAt("folder", 2))
        expect(rows(`SELECT COUNT(*) AS n FROM task t JOIN section s ON s.id = t.sectionID JOIN section_group g ON g.id = s.groupID
            JOIN note n ON n.id = g.noteID WHERE n.workspaceID = ${workspaceId}`)[0].n).toBe(5)
    })

    it("an items export keeps the archived content, and the imported top item is visible", async () => {
        await unarchiveDBItem("folder", 2)
        await archiveDBItem("note", 3)
        await archiveDBItem("folder", 2)
        const data = validateWorkspaceExport(JSON.parse(JSON.stringify(await buildDBItemExport("folder", 2))))
        expect(data.folders[0].archived_at).toBeTruthy()
        expect(data.notes.map(n => !!n.archived_at)).toEqual([true])
        const result = await importDBItems(data, 1, null)
        const created = result.items[0]
        expect(created.type).toBe("folder")
        expect(archivedAt("folder", created.id)).toBeNull()
        expect(rows(`SELECT archived_at FROM note WHERE folderID = ${created.id}`)[0].archived_at).not.toBeNull()
    })

    it("an export file with the old archived flags (and no archive date) imports as visible", async () => {
        const data = JSON.parse(JSON.stringify(await buildDBWorkspaceExport(1)))
        for (const note of data.notes) {
            delete note.archived_at
            for (const g of note.content.groups) {
                delete g.archived_at
                for (const s of g.sections) {
                    s.archived = true
                    delete s.archived_at
                    for (const t of s.tasks) t.archived = true
                }
            }
        }
        for (const folder of data.folders) delete folder.archived_at
        const { workspaceId } = await importDBWorkspace(validateWorkspaceExport(data))
        expect(await getDBArchiveCount(workspaceId)).toBe(0)
    })

    it("rejects an archive date that is not a string", () => {
        const base = { format: "easytask-workspace", version: 1, exportedAt: "", workspace: { name: "W", color: null }, notes: [], templates: [] }
        expect(() => validateWorkspaceExport({ ...base, folders: [{ ref: "f1", parentRef: null, name: "F", color: null, position: 0, archived_at: 3 }] }))
            .toThrow()
    })
})
