import { beforeEach, describe, expect, it, vi } from "vitest"
import {
    NOOP_RECORDER, captureSectionPlace, captureTaskPlace, captureTreePlace, createUndoCommands, createUndoRecorder,
    getItemName, isUndoableType, makeLabel, type UndoDeps,
} from "./commands"
import type { UndoCommand } from "./stack"
import { makeGroup, makeNote, makeSection, makeTask } from "@/test/ui-fixtures"
import type { Folder } from "@/types/types"

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))

const fn = () => vi.fn().mockResolvedValue(undefined)

function makeDeps() {
    const rollbacks = { patch: vi.fn(), remove: vi.fn(), section: vi.fn(), task: vi.fn() }
    const deps = {
        getWorkspaceId: vi.fn(() => 7 as number | null),
        workspace: {
            renameItem: fn(), updateItemColor: fn(), deleteItem: fn(), restoreItem: fn(), moveTreeItem: fn(),
            moveSection: fn(), moveTask: fn(), updateTaskCompletion: fn(), updateTaskPriority: fn(),
            updateTaskDescription: fn(), getWorkspaceData: fn(),
        },
        note: {
            patchTask: vi.fn(() => rollbacks.patch), patchSection: vi.fn(() => rollbacks.patch), patchGroup: vi.fn(() => rollbacks.patch),
            removeGroup: vi.fn(() => rollbacks.remove), removeSection: vi.fn(() => rollbacks.remove), removeTask: vi.fn(() => rollbacks.remove),
            applySectionMove: vi.fn(() => rollbacks.section), applyTaskMove: vi.fn(() => rollbacks.task),
            refreshActiveNote: fn(),
        },
    }
    return { deps: deps as unknown as UndoDeps & typeof deps, rollbacks }
}

const folder = (over: Partial<Folder>): Folder => ({
    id: 1, workspaceID: 1, folderID: null, name: "F", position: 0, creation_date: "", creation_time: "", edit_date: "", edit_time: "",
    subfolders: [], notes: [], ...over,
})

let ctx: ReturnType<typeof makeDeps>
let commands: ReturnType<typeof createUndoCommands>

beforeEach(() => {
    ctx = makeDeps()
    commands = createUndoCommands(ctx.deps)
    vi.spyOn(console, "error").mockImplementation(() => {})
})

describe("labels", () => {
    it("composes the action, the type and the shortened name", () => {
        expect(makeLabel("delete", "note", "Spesa")).toBe("Elimina nota \"Spesa\"")
        expect(makeLabel("create", "section_group", "")).toBe("Crea gruppo")
        expect(makeLabel("move", "task", "x".repeat(100))).toContain("…")
        expect(makeLabel("rename", "folder", "  a \n  b ")).toBe("Rinomina cartella \"a b\"")
    })

    it("reads the name of any item", () => {
        expect(getItemName({ name: "n" })).toBe("n")
        expect(getItemName({ title: "t" })).toBe("t")
        expect(getItemName({ text: "x" })).toBe("x")
        expect(getItemName({})).toBeUndefined()
    })

    it("knows which item types are undoable", () => {
        expect(["folder", "note", "section_group", "section", "task"].every(t => isUndoableType(t as never))).toBe(true)
        expect(["workspace", "audio_file", "note_template"].some(t => isUndoableType(t as never))).toBe(false)
    })
})

describe("rename", () => {
    it("undoes to the old name and redoes to the new one, patching the note optimistically", async () => {
        const command = commands.rename("task", 5, "old", "new")
        expect(command.label).toBe("Rinomina task \"old\"")

        await command.undo()
        expect(ctx.deps.note.patchTask).toHaveBeenLastCalledWith(5, { text: "old" })
        expect(ctx.deps.workspace.renameItem).toHaveBeenLastCalledWith("task", 5, "old")
        await command.redo()
        expect(ctx.deps.note.patchTask).toHaveBeenLastCalledWith(5, { text: "new" })
        expect(ctx.deps.workspace.renameItem).toHaveBeenLastCalledWith("task", 5, "new")
        expect(ctx.rollbacks.patch).not.toHaveBeenCalled()
    })

    it("patches sections by title and groups by name (blank = unnamed)", async () => {
        await commands.rename("section", 2, "a", "b").redo()
        expect(ctx.deps.note.patchSection).toHaveBeenCalledWith(2, { title: "b" })
        await commands.rename("section_group", 3, "Named", "").redo()
        expect(ctx.deps.note.patchGroup).toHaveBeenCalledWith(3, { name: null })
        expect(ctx.deps.workspace.renameItem).toHaveBeenLastCalledWith("section_group", 3, "")
    })

    it("leaves folders and notes to renameItem (it patches the sidebar tree itself)", async () => {
        await commands.rename("folder", 1, "a", "b").undo()
        await commands.rename("note", 2, "a", "b").undo()
        expect(ctx.deps.note.patchTask).not.toHaveBeenCalled()
        expect(ctx.deps.note.patchSection).not.toHaveBeenCalled()
        expect(ctx.deps.note.patchGroup).not.toHaveBeenCalled()
        expect(ctx.deps.workspace.renameItem).toHaveBeenCalledTimes(2)
    })

    it("rolls the optimistic patch back and rejects when the write fails", async () => {
        ctx.deps.workspace.renameItem.mockRejectedValueOnce(new Error("UNIQUE"))
        await expect(commands.rename("task", 5, "old", "new").undo()).rejects.toThrow("UNIQUE")
        expect(ctx.rollbacks.patch).toHaveBeenCalledTimes(1)
    })
})

describe("color", () => {
    it("restores the previous color, none meaning null/undefined", async () => {
        const command = commands.color("section", 4, "S", null, "#fff")
        await command.redo()
        expect(ctx.deps.note.patchSection).toHaveBeenLastCalledWith(4, { color: "#fff" })
        expect(ctx.deps.workspace.updateItemColor).toHaveBeenLastCalledWith("section", 4, "#fff")
        await command.undo()
        expect(ctx.deps.note.patchSection).toHaveBeenLastCalledWith(4, { color: null })
        expect(ctx.deps.workspace.updateItemColor).toHaveBeenLastCalledWith("section", 4, undefined)
    })

    it("works for tasks, and for folders without patching the note", async () => {
        await commands.color("task", 4, "T", "#000", undefined).redo()
        expect(ctx.deps.note.patchTask).toHaveBeenCalledWith(4, { color: null })
        await commands.color("folder", 1, "F", "#000", "#111").undo()
        expect(ctx.deps.workspace.updateItemColor).toHaveBeenLastCalledWith("folder", 1, "#000")
        expect(ctx.deps.note.patchSection).not.toHaveBeenCalled()
    })

    it("rolls back and rejects on failure", async () => {
        ctx.deps.workspace.updateItemColor.mockRejectedValueOnce(new Error("fail"))
        await expect(commands.color("task", 1, "T", null, "#fff").redo()).rejects.toThrow("fail")
        expect(ctx.rollbacks.patch).toHaveBeenCalled()
    })
})

describe("task flags", () => {
    it("completion goes back to the previous value and forward again", async () => {
        const command = commands.taskCompletion(9, "Buy milk", false, true)
        expect(command.label).toBe("Completa task \"Buy milk\"")
        await command.undo()
        expect(ctx.deps.note.patchTask).toHaveBeenLastCalledWith(9, { completed: false })
        expect(ctx.deps.workspace.updateTaskCompletion).toHaveBeenLastCalledWith(9, false)
        await command.redo()
        expect(ctx.deps.workspace.updateTaskCompletion).toHaveBeenLastCalledWith(9, true)
        expect(commands.taskCompletion(9, "x", true, false).label).toBe("Riapri task \"x\"")
    })

    it("priority goes back and forward", async () => {
        const command = commands.taskPriority(9, "Buy milk", false, true)
        expect(command.label).toBe("Aggiungi priorità a task \"Buy milk\"")
        await command.undo()
        expect(ctx.deps.note.patchTask).toHaveBeenLastCalledWith(9, { priority: false })
        expect(ctx.deps.workspace.updateTaskPriority).toHaveBeenLastCalledWith(9, false)
        await command.redo()
        expect(ctx.deps.workspace.updateTaskPriority).toHaveBeenLastCalledWith(9, true)
        expect(commands.taskPriority(9, "x", true, false).label).toBe("Rimuovi priorità da task \"x\"")
    })

    it("description: an empty one is stored as undefined", async () => {
        const command = commands.taskDescription(9, "T", "old text", "")
        await command.redo()
        expect(ctx.deps.workspace.updateTaskDescription).toHaveBeenLastCalledWith(9, undefined)
        expect(ctx.deps.note.patchTask).toHaveBeenLastCalledWith(9, { description: "" })
        await command.undo()
        expect(ctx.deps.workspace.updateTaskDescription).toHaveBeenLastCalledWith(9, "old text")
    })

    it.each([
        ["taskCompletion", "updateTaskCompletion", [1, "T", false, true]],
        ["taskPriority", "updateTaskPriority", [1, "T", false, true]],
        ["taskDescription", "updateTaskDescription", [1, "T", "a", "b"]],
    ] as const)("%s rolls back and rejects when the write fails", async (builder, action, args) => {
        ctx.deps.workspace[action].mockRejectedValueOnce(new Error("fail"))
        const command = (commands[builder] as (...a: unknown[]) => UndoCommand)(...args)
        await expect(command.undo()).rejects.toThrow("fail")
        expect(ctx.rollbacks.patch).toHaveBeenCalledTimes(1)
    })
})

describe("remove and create", () => {
    it("a deleted folder or note is restored (same id) and the tree is reloaded", async () => {
        const command = commands.remove("note", 3, "Spesa")
        expect(command.label).toBe("Elimina nota \"Spesa\"")
        await command.undo()
        expect(ctx.deps.workspace.restoreItem).toHaveBeenCalledWith("note", 3)
        expect(ctx.deps.workspace.getWorkspaceData).toHaveBeenCalledWith(7)
        expect(ctx.deps.note.refreshActiveNote).not.toHaveBeenCalled()
    })

    it("redo of a delete moves the item to the trash again", async () => {
        await commands.remove("folder", 3, "F").redo()
        expect(ctx.deps.workspace.deleteItem).toHaveBeenCalledWith("folder", 3)
        expect(ctx.deps.note.removeSection).not.toHaveBeenCalled()
    })

    it.each([
        ["section_group", "removeGroup"],
        ["section", "removeSection"],
        ["task", "removeTask"],
    ] as const)("a deleted %s is restored by id and the open note is reloaded; redo removes it optimistically", async (type, removal) => {
        const command = commands.remove(type, 11, "N")
        await command.undo()
        expect(ctx.deps.workspace.restoreItem).toHaveBeenCalledWith(type, 11)
        expect(ctx.deps.note.refreshActiveNote).toHaveBeenCalledTimes(1)
        expect(ctx.deps.workspace.getWorkspaceData).not.toHaveBeenCalled()

        await command.redo()
        expect(ctx.deps.note[removal]).toHaveBeenCalledWith(11)
        expect(ctx.deps.workspace.deleteItem).toHaveBeenCalledWith(type, 11)
    })

    it("a creation is undone by deleting the new item and redone by restoring it", async () => {
        const command = commands.create("task", 21, "New")
        expect(command.label).toBe("Crea task \"New\"")
        await command.undo()
        expect(ctx.deps.note.removeTask).toHaveBeenCalledWith(21)
        expect(ctx.deps.workspace.deleteItem).toHaveBeenCalledWith("task", 21)
        await command.redo()
        expect(ctx.deps.workspace.restoreItem).toHaveBeenCalledWith("task", 21)
        expect(ctx.deps.note.refreshActiveNote).toHaveBeenCalledTimes(1)
    })

    it("a created folder is undone through deleteItem (it updates the tree) and redone with a tree reload", async () => {
        const command = commands.create("folder", 2, "F")
        await command.undo()
        expect(ctx.deps.workspace.deleteItem).toHaveBeenCalledWith("folder", 2)
        await command.redo()
        expect(ctx.deps.workspace.restoreItem).toHaveBeenCalledWith("folder", 2)
        expect(ctx.deps.workspace.getWorkspaceData).toHaveBeenCalledWith(7)
    })

    it("puts the optimistic removal back and rejects when the delete fails", async () => {
        ctx.deps.workspace.deleteItem.mockRejectedValueOnce(new Error("locked"))
        await expect(commands.create("section", 2, "S").undo()).rejects.toThrow("locked")
        expect(ctx.rollbacks.remove).toHaveBeenCalledTimes(1)
    })

    it("rejects when the restore fails (e.g. name taken) and does not reload", async () => {
        ctx.deps.workspace.restoreItem.mockRejectedValueOnce(new Error("name taken"))
        await expect(commands.remove("note", 1, "N").undo()).rejects.toThrow("name taken")
        expect(ctx.deps.workspace.getWorkspaceData).not.toHaveBeenCalled()
    })

    it("a failing reload after a successful restore does not fail the command", async () => {
        ctx.deps.workspace.getWorkspaceData.mockRejectedValueOnce(new Error("reload"))
        await expect(commands.remove("note", 1, "N").undo()).resolves.toBeUndefined()
        ctx.deps.note.refreshActiveNote.mockRejectedValueOnce(new Error("reload"))
        await expect(commands.remove("task", 1, "N").undo()).resolves.toBeUndefined()
    })

    it("skips the tree reload outside a workspace", async () => {
        ctx.deps.getWorkspaceId.mockReturnValue(null)
        await commands.remove("note", 1, "N").undo()
        expect(ctx.deps.workspace.getWorkspaceData).not.toHaveBeenCalled()
    })
})

describe("moves", () => {
    it("treeMove goes back to the old parent and index and reloads the tree", async () => {
        const command = commands.treeMove("note", 5, "N", { folderId: 2, index: 1 }, { folderId: null, index: 4 })
        await command.undo()
        expect(ctx.deps.workspace.moveTreeItem).toHaveBeenLastCalledWith("note", 5, 2, 1)
        expect(ctx.deps.workspace.getWorkspaceData).toHaveBeenCalledWith(7)
        await command.redo()
        expect(ctx.deps.workspace.moveTreeItem).toHaveBeenLastCalledWith("note", 5, null, 4)
    })

    it("treeMove rejects without reloading when the move fails", async () => {
        ctx.deps.workspace.moveTreeItem.mockRejectedValueOnce(new Error("into itself"))
        await expect(commands.treeMove("folder", 5, "F", { folderId: null, index: 0 }, { folderId: 1, index: 0 }).undo()).rejects.toThrow("into itself")
        expect(ctx.deps.workspace.getWorkspaceData).not.toHaveBeenCalled()
    })

    it("sectionMove is optimistic both ways and rolls back on failure", async () => {
        const command = commands.sectionMove(8, "S", { groupId: 1, index: 2 }, { groupId: 3, index: 0 })
        await command.undo()
        expect(ctx.deps.note.applySectionMove).toHaveBeenLastCalledWith(8, 1, 2)
        expect(ctx.deps.workspace.moveSection).toHaveBeenLastCalledWith(8, 1, 2)
        await command.redo()
        expect(ctx.deps.workspace.moveSection).toHaveBeenLastCalledWith(8, 3, 0)

        ctx.deps.workspace.moveSection.mockRejectedValueOnce(new Error("dup title"))
        await expect(command.undo()).rejects.toThrow("dup title")
        expect(ctx.rollbacks.section).toHaveBeenCalledTimes(1)
    })

    it("sectionMoveToNewGroup: undo moves the section back and trashes the empty group; redo restores the same group", async () => {
        const command = commands.sectionMoveToNewGroup(8, "S", 40, { groupId: 1, index: 2 })
        await command.undo()
        expect(ctx.deps.workspace.moveSection).toHaveBeenCalledWith(8, 1, 2)
        expect(ctx.deps.note.removeGroup).toHaveBeenCalledWith(40)
        expect(ctx.deps.workspace.deleteItem).toHaveBeenCalledWith("section_group", 40)
        const order = [ctx.deps.workspace.moveSection.mock.invocationCallOrder[0], ctx.deps.workspace.deleteItem.mock.invocationCallOrder[0]]
        expect(order[0]).toBeLessThan(order[1])

        await command.redo()
        expect(ctx.deps.workspace.restoreItem).toHaveBeenCalledWith("section_group", 40)
        expect(ctx.deps.workspace.moveSection).toHaveBeenLastCalledWith(8, 40, 0)
        expect(ctx.deps.note.refreshActiveNote).toHaveBeenCalledTimes(1)
    })

    it("sectionMoveToNewGroup: a failed move back leaves the group alone", async () => {
        ctx.deps.workspace.moveSection.mockRejectedValueOnce(new Error("bad"))
        await expect(commands.sectionMoveToNewGroup(8, "S", 40, { groupId: 1, index: 0 }).undo()).rejects.toThrow("bad")
        expect(ctx.deps.workspace.deleteItem).not.toHaveBeenCalled()
    })

    it("sectionMoveToNewGroup: a failed delete of the group rejects after the section moved back", async () => {
        ctx.deps.workspace.deleteItem.mockRejectedValueOnce(new Error("locked"))
        await expect(commands.sectionMoveToNewGroup(8, "S", 40, { groupId: 1, index: 0 }).undo()).rejects.toThrow("locked")
        expect(ctx.rollbacks.remove).toHaveBeenCalledTimes(1)
    })

    it("taskMove moves back to the old section/parent/index with an optimistic update", async () => {
        const command = commands.taskMove(6, "T", { sectionId: 1, parentTaskId: null, index: 3 }, { sectionId: 2, parentTaskId: 9, index: 0 })
        await command.undo()
        expect(ctx.deps.note.applyTaskMove).toHaveBeenLastCalledWith(6, { sectionId: 1, parentTaskId: null }, 3)
        expect(ctx.deps.workspace.moveTask).toHaveBeenLastCalledWith(6, { sectionId: 1, parentTaskId: null }, 3)
        await command.redo()
        expect(ctx.deps.workspace.moveTask).toHaveBeenLastCalledWith(6, { sectionId: 2, parentTaskId: 9 }, 0)

        ctx.deps.workspace.moveTask.mockRejectedValueOnce(new Error("invalid"))
        await expect(command.undo()).rejects.toThrow("invalid")
        expect(ctx.rollbacks.task).toHaveBeenCalledTimes(1)
    })
})

describe("recorder", () => {
    it("records the command built by every builder", () => {
        const record = vi.fn()
        const recorder = createUndoRecorder(commands, record)
        recorder.rename("task", 1, "a", "b")
        recorder.create("note", 2, "N")
        expect(record).toHaveBeenCalledTimes(2)
        expect((record.mock.calls[0][0] as UndoCommand).label).toBe("Rinomina task \"a\"")
        expect((record.mock.calls[1][0] as UndoCommand).label).toBe("Crea nota \"N\"")
        const own: UndoCommand = { label: "x", undo: fn(), redo: fn() }
        recorder.record(own)
        expect(record).toHaveBeenLastCalledWith(own)
    })

    it("the no-op recorder accepts every call", () => {
        expect(() => {
            NOOP_RECORDER.rename("task", 1, "a", "b")
            NOOP_RECORDER.taskMove(1, "t", { sectionId: 1, parentTaskId: null, index: 0 }, { sectionId: 1, parentTaskId: null, index: 1 })
            NOOP_RECORDER.record({ label: "x", undo: fn(), redo: fn() })
        }).not.toThrow()
    })
})

describe("place capture", () => {
    it("finds the parent and index of a folder or a note in the sidebar tree", () => {
        const tree = {
            rootFolders: [folder({ id: 1, notes: [makeNote({ id: 10, name: "A", folderID: 1 }), makeNote({ id: 11, name: "B", folderID: 1 })], subfolders: [folder({ id: 2, name: "Sub", folderID: 1 })] })],
            rootNotes: [makeNote({ id: 12, name: "Root" })],
        }
        expect(captureTreePlace(tree, "note", 11)).toEqual({ folderId: 1, index: 1, name: "B" })
        expect(captureTreePlace(tree, "note", 12)).toEqual({ folderId: null, index: 0, name: "Root" })
        expect(captureTreePlace(tree, "folder", 2)).toEqual({ folderId: 1, index: 0, name: "Sub" })
        expect(captureTreePlace(tree, "note", 99)).toBeNull()
        expect(captureTreePlace(null, "note", 1)).toBeNull()
    })

    it("finds where a section and a task sit in the note", () => {
        const sub = makeTask({ id: 31, sectionID: 20, taskID: 30, text: "sub" })
        const tree = {
            groups: [
                makeGroup({ id: 1, sections: [makeSection({ id: 19, groupID: 1 }), makeSection({ id: 20, groupID: 1, title: "S", tasks: [makeTask({ id: 30, sectionID: 20, text: "top", subtasks: [sub] })] })] }),
            ],
        }
        expect(captureSectionPlace(tree, 20)).toEqual({ groupId: 1, index: 1, name: "S" })
        expect(captureSectionPlace(tree, 99)).toBeNull()
        expect(captureTaskPlace(tree, 30)).toEqual({ sectionId: 20, parentTaskId: null, index: 0, name: "top" })
        expect(captureTaskPlace(tree, 31)).toEqual({ sectionId: 20, parentTaskId: 30, index: 0, name: "sub" })
        expect(captureTaskPlace(tree, 99)).toBeNull()
        expect(captureTaskPlace(undefined, 1)).toBeNull()
    })
})
