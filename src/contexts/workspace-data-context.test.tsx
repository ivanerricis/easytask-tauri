import type { ReactNode } from "react"
import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { WorkspaceDataProvider, useWorkspaceData, useWorkspaceLoading } from "./workspace-data-context"
import { useActiveNote, useActiveNoteActions } from "./active-note-context"
import { useTabs, useTabsActions } from "./tabs-context"
import { getDBWorkspaceData } from "@/db/queries/workspace"
import { getDBNoteData } from "@/db/queries/note"
import { updateDBGroupPositions } from "@/db/queries/group"
import { createDBTask } from "@/db/queries/task"
import { deleteDBItem, renameDBItem, updateDBColor } from "@/db/queries/shared_queries"
import { createDBSection } from "@/db/queries/section"
import { createDBNoteInFolder } from "@/db/queries/note"
import { moveDBTreeItem } from "@/db/queries/tree"
import { moveDBSection, moveDBSectionToNewGroup, moveDBTask } from "@/db/queries/move"
import { emptyDBTrash, getDBTrash, purgeDBItem, restoreDBItem } from "@/db/queries/trash"
import { deferred } from "@/test/ui-render"
import { makeGroup, makeNote, makeSection, makeTask } from "@/test/ui-fixtures"
import type { Folder } from "@/types/types"

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))

vi.mock("@/db/queries/workspace", () => ({ getDBWorkspaceData: vi.fn() }))
vi.mock("@/db/queries/note", () => ({
    createDBNoteInFolder: vi.fn(),
    createDBWorkspaceNote: vi.fn(),
    getDBNoteData: vi.fn(),
}))
vi.mock("@/db/queries/folder", () => ({
    createDBSubFolder: vi.fn(),
    createDBWorkspaceFolder: vi.fn(),
    updateDBFolderColorContent: vi.fn(),
}))
vi.mock("@/db/queries/section", () => ({
    createDBSection: vi.fn(),
    createDBSectionInGroup: vi.fn(),
}))
vi.mock("@/db/queries/task", () => ({
    createDBSubTask: vi.fn(),
    createDBTask: vi.fn(),
    updateDBTaskCompletion: vi.fn(),
    updateDBTaskDescription: vi.fn(),
    updateDBTaskPriority: vi.fn(),
}))
vi.mock("@/db/queries/group", () => ({ updateDBGroupPositions: vi.fn() }))
vi.mock("@/db/queries/tree", () => ({ moveDBTreeItem: vi.fn() }))
vi.mock("@/db/queries/move", () => ({ moveDBSection: vi.fn(), moveDBSectionToNewGroup: vi.fn(), moveDBTask: vi.fn() }))
vi.mock("@/db/queries/trash", () => ({
    getDBTrash: vi.fn(),
    restoreDBItem: vi.fn(),
    purgeDBItem: vi.fn(),
    emptyDBTrash: vi.fn(),
}))
vi.mock("@/db/queries/shared_queries", () => ({
    renameDBItem: vi.fn(),
    updateDBColor: vi.fn(),
    deleteDBItem: vi.fn(),
}))

const wrapper = ({ children }: { children: ReactNode }) => <WorkspaceDataProvider>{children}</WorkspaceDataProvider>

/** Every context of the provider tree in one object, like the old single context. */
const useAll = () => ({
    ...useWorkspaceData(),
    isLoading: useWorkspaceLoading(),
    ...useTabs(),
    ...useTabsActions(),
    ...useActiveNote(),
    ...useActiveNoteActions(),
})

const makeFolder = (over: Partial<Folder>): Folder => ({
    id: 1,
    workspaceID: 1,
    folderID: null,
    name: "F",
    position: 0,
    creation_date: "",
    creation_time: "",
    edit_date: "",
    edit_time: "",
    subfolders: [],
    notes: [],
    ...over,
})

describe("WorkspaceDataContext", () => {
    beforeEach(() => {
        vi.resetAllMocks()
    })

    it("throws when used outside the provider", () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {})
        expect(() => renderHook(() => useAll())).toThrow(/WorkspaceDataProvider/)
        spy.mockRestore()
    })

    describe("getWorkspaceData", () => {
        it("builds the folder tree with nested folders and notes", async () => {
            const root = makeFolder({ id: 1 })
            const child = makeFolder({ id: 2, folderID: 1 })
            const noteInChild = makeNote({ id: 10, folderID: 2 })
            const rootNote = makeNote({ id: 11, folderID: null })
            vi.mocked(getDBWorkspaceData).mockResolvedValue({
                folders: [root, child],
                notes: [noteInChild, rootNote],
            } as never)
            const { result } = renderHook(() => useAll(), { wrapper })

            await act(() => result.current.getWorkspaceData(1))

            const tree = result.current.workspaceDataTree!
            expect(tree.rootFolders.map(f => f.id)).toEqual([1])
            expect(tree.rootFolders[0].subfolders.map(f => f.id)).toEqual([2])
            expect(tree.rootFolders[0].subfolders[0].notes.map(n => n.id)).toEqual([10])
            expect(tree.rootNotes.map(n => n.id)).toEqual([11])
        })

        it("handles an empty result", async () => {
            vi.mocked(getDBWorkspaceData).mockResolvedValue(undefined as never)
            const { result } = renderHook(() => useAll(), { wrapper })
            await act(() => result.current.getWorkspaceData(1))
            expect(result.current.workspaceDataTree).toEqual({ rootFolders: [], rootNotes: [] })
        })

        it("sets the error, rethrows and resets isLoading on failure", async () => {
            vi.mocked(getDBWorkspaceData).mockRejectedValue(new Error("boom"))
            const { result } = renderHook(() => useAll(), { wrapper })

            await act(async () => {
                await expect(result.current.getWorkspaceData(1)).rejects.toThrow("boom")
            })
            expect(result.current.error).toBe("Errore caricamento dati del Workspace")
            expect(result.current.isLoading).toBe(false)
        })
    })

    describe("note data of the active note", () => {
        const open = async (result: { current: ReturnType<typeof useAll> }, id = 1) => {
            await act(async () => { result.current.openNote(id) })
            await waitFor(() => expect(result.current.noteDataTree).not.toBeNull())
        }

        it("builds the note tree with sections, tasks and subtasks", async () => {
            vi.mocked(getDBNoteData).mockResolvedValue({
                groups: [makeGroup({ id: 1 })],
                sections: [makeSection({ id: 5, groupID: 1 })],
                tasks: [
                    makeTask({ id: 100, sectionID: 5, taskID: null }),
                    makeTask({ id: 101, sectionID: 5, taskID: 100 }),
                ],
            } as never)
            const { result } = renderHook(() => useAll(), { wrapper })

            await open(result)

            const section = result.current.noteDataTree!.groups[0].sections[0]
            expect(section.tasks.map(t => t.id)).toEqual([100])
            expect(section.tasks[0].subtasks.map(t => t.id)).toEqual([101])
        })

        it("keeps the input order and nests groups, sections, tasks and deep subtasks", async () => {
            vi.mocked(getDBNoteData).mockResolvedValue({
                groups: [makeGroup({ id: 2 }), makeGroup({ id: 1 })],
                sections: [
                    makeSection({ id: 7, groupID: 1 }),
                    makeSection({ id: 6, groupID: 2 }),
                    makeSection({ id: 5, groupID: 2 }),
                ],
                tasks: [
                    makeTask({ id: 12, sectionID: 5, taskID: null }),
                    makeTask({ id: 11, sectionID: 5, taskID: null }),
                    makeTask({ id: 21, sectionID: 5, taskID: 11 }),
                    makeTask({ id: 20, sectionID: 5, taskID: 11 }),
                    makeTask({ id: 30, sectionID: 5, taskID: 20 }),
                    makeTask({ id: 40, sectionID: 7, taskID: null }),
                ],
            } as never)
            const { result } = renderHook(() => useAll(), { wrapper })

            await open(result)

            const [first, second] = result.current.noteDataTree!.groups
            expect(first.id).toBe(2)
            expect(first.sections.map(s => s.id)).toEqual([6, 5])
            expect(first.sections[0].tasks).toEqual([])
            const tasks = first.sections[1].tasks
            expect(tasks.map(t => t.id)).toEqual([12, 11])
            expect(tasks[0].subtasks).toEqual([])
            expect(tasks[1].subtasks.map(t => t.id)).toEqual([21, 20])
            expect(tasks[1].subtasks[1].subtasks.map(t => t.id)).toEqual([30])
            expect(second.sections.map(s => s.id)).toEqual([7])
            expect(second.sections[0].tasks.map(t => t.id)).toEqual([40])
        })

        it("rejects and keeps the cached data when a refresh fails", async () => {
            vi.spyOn(console, "error").mockImplementation(() => {})
            vi.mocked(getDBNoteData).mockResolvedValueOnce({ groups: [makeGroup({ id: 1 })], sections: [], tasks: [] } as never)
            const { result } = renderHook(() => useAll(), { wrapper })
            await open(result)

            vi.mocked(getDBNoteData).mockRejectedValueOnce(new Error("nope"))
            await act(async () => {
                await expect(result.current.refreshActiveNote()).rejects.toThrow("nope")
            })
            expect(result.current.noteDataTree!.groups.map(g => g.id)).toEqual([1])
        })
    })

    describe("isLoading counter", () => {
        it("stays true until all overlapping operations settle", async () => {
            const a = deferred()
            const b = deferred()
            vi.mocked(createDBTask).mockReturnValueOnce(a.promise as never)
            vi.mocked(createDBSection).mockReturnValueOnce(b.promise as never)
            const { result } = renderHook(() => useAll(), { wrapper })

            let pa!: Promise<void>
            let pb!: Promise<void>
            act(() => {
                pa = result.current.createTask(1, "t")
                pb = result.current.createSection(1, "s", 0)
            })
            expect(result.current.isLoading).toBe(true)

            await act(async () => {
                a.resolve()
                await pa
            })
            expect(result.current.isLoading).toBe(true)

            await act(async () => {
                b.reject(new Error("x"))
                await expect(pb).rejects.toThrow("x")
            })
            expect(result.current.isLoading).toBe(false)
        })
    })

    describe("create / rename / delete", () => {
        it("forwards createTask to the db layer", async () => {
            const { result } = renderHook(() => useAll(), { wrapper })
            await act(() => result.current.createTask(3, "hello"))
            expect(createDBTask).toHaveBeenCalledWith(3, "hello")
        })

        it("forwards renameItem and propagates errors", async () => {
            vi.mocked(renameDBItem).mockRejectedValueOnce(new Error("rename failed"))
            const { result } = renderHook(() => useAll(), { wrapper })

            await act(async () => {
                await expect(result.current.renameItem("task", 4, "new")).rejects.toThrow("rename failed")
            })
            expect(renameDBItem).toHaveBeenCalledWith("task", 4, "new")
            expect(result.current.isLoading).toBe(false)
        })

        it("forwards deleteItem and updateItemColor", async () => {
            const { result } = renderHook(() => useAll(), { wrapper })
            await act(async () => {
                await result.current.deleteItem("note", 9)
                await result.current.updateItemColor("note", 9, "#000")
            })
            expect(deleteDBItem).toHaveBeenCalledWith("note", 9)
            expect(updateDBColor).toHaveBeenCalledWith("note", 9, "#000")
        })
    })

    describe("deleteItem and the tabs", () => {
        // The tabs follow the notes list: a deleted note disappears from the tabs once the workspace data is reloaded
        const setup = async (folders: Folder[], noteList: ReturnType<typeof makeNote>[], open: number[], current: number | null) => {
            vi.mocked(getDBNoteData).mockResolvedValue({ groups: [], sections: [], tasks: [] } as never)
            vi.mocked(getDBWorkspaceData).mockResolvedValue({ folders, notes: noteList } as never)
            const hook = renderHook(() => useAll(), { wrapper })
            await act(() => hook.result.current.getWorkspaceData(1))
            await act(async () => {
                open.forEach(id => hook.result.current.openNote(id))
                if (current !== null) hook.result.current.activateNote(current)
            })
            return hook.result
        }
        const reload = (result: { current: ReturnType<typeof useAll> }, folders: Folder[], noteList: ReturnType<typeof makeNote>[]) => {
            vi.mocked(getDBWorkspaceData).mockResolvedValue({ folders, notes: noteList } as never)
            return act(() => result.current.getWorkspaceData(1))
        }
        const n = (id: number, folderID: number | null = null) => makeNote({ id, folderID })

        it("removes a deleted note from the tabs and selects the neighbour", async () => {
            const result = await setup([], [n(1), n(2), n(3)], [1, 2, 3], 2)
            await act(() => result.current.deleteItem("note", 2))
            await reload(result, [], [n(1), n(3)])
            expect(result.current.tabs.map(x => x.id)).toEqual([1, 3])
            expect(result.current.currentNote?.id).toBe(3)
        })

        it("selects the previous tab when the last tab is deleted, and null when none is left", async () => {
            const result = await setup([], [n(1), n(2)], [1, 2], 2)
            await act(() => result.current.deleteItem("note", 2))
            await reload(result, [], [n(1)])
            expect(result.current.currentNote?.id).toBe(1)
            await act(() => result.current.deleteItem("note", 1))
            await reload(result, [], [])
            expect(result.current.tabs).toEqual([])
            expect(result.current.currentNote).toBeNull()
        })

        it("keeps the current note when a background tab is deleted", async () => {
            const result = await setup([], [n(1), n(2)], [1, 2], 1)
            await act(() => result.current.deleteItem("note", 2))
            await reload(result, [], [n(1)])
            expect(result.current.tabs.map(x => x.id)).toEqual([1])
            expect(result.current.currentNote?.id).toBe(1)
        })

        it("closes the tabs of every note inside a deleted folder and clears the current folder", async () => {
            const folders = [makeFolder({ id: 1 }), makeFolder({ id: 2, folderID: 1 }), makeFolder({ id: 3 })]
            const result = await setup(folders, [n(10, 1), n(11, 2), n(12, 3), n(13)], [10, 12, 11, 13], 11)
            act(() => result.current.setCurrentFolder(folders[1]))
            await act(() => result.current.deleteItem("folder", 1))
            await reload(result, [makeFolder({ id: 3 })], [n(12, 3), n(13)])
            expect(result.current.tabs.map(x => x.id)).toEqual([12, 13])
            expect(result.current.currentNote?.id).toBe(13)
            expect(result.current.currentFolder).toBeNull()
        })

        it("does not touch the tabs when the db delete fails", async () => {
            const result = await setup([], [n(1)], [1], 1)
            vi.mocked(deleteDBItem).mockRejectedValueOnce(new Error("nope"))
            await act(async () => {
                await expect(result.current.deleteItem("note", 1)).rejects.toThrow("nope")
            })
            expect(result.current.tabs).toHaveLength(1)
        })
    })

    describe("move and trash", () => {
        it("forwards moveTreeItem without reloading data", async () => {
            const { result } = renderHook(() => useAll(), { wrapper })
            await act(() => result.current.moveTreeItem("note", 3, null, 2))
            expect(moveDBTreeItem).toHaveBeenCalledWith("note", 3, null, 2)
            expect(getDBWorkspaceData).not.toHaveBeenCalled()
        })

        it("forwards the section and task moves without reloading data", async () => {
            const { result } = renderHook(() => useAll(), { wrapper })
            await act(() => result.current.moveSection(4, 2, 1))
            await act(() => result.current.moveSectionToNewGroup(4, 0))
            await act(() => result.current.moveTask(9, { sectionId: 4, parentTaskId: 7 }, 3))
            expect(moveDBSection).toHaveBeenCalledWith(4, 2, 1)
            expect(moveDBSectionToNewGroup).toHaveBeenCalledWith(4, 0)
            expect(moveDBTask).toHaveBeenCalledWith(9, { sectionId: 4, parentTaskId: 7 }, 3)
            expect(getDBNoteData).not.toHaveBeenCalled()
        })

        it("propagates task move errors", async () => {
            vi.mocked(moveDBTask).mockRejectedValueOnce({ code: "TASK_MOVE_INVALID", message: "x" })
            const { result } = renderHook(() => useAll(), { wrapper })
            await act(async () => {
                await expect(result.current.moveTask(1, { sectionId: 1, parentTaskId: 1 }, 0)).rejects.toMatchObject({ code: "TASK_MOVE_INVALID" })
            })
            expect(result.current.isLoading).toBe(false)
        })

        it("propagates move errors", async () => {
            vi.mocked(moveDBTreeItem).mockRejectedValueOnce({ code: "FOLDER_MOVE_INVALID", message: "x" })
            const { result } = renderHook(() => useAll(), { wrapper })
            await act(async () => {
                await expect(result.current.moveTreeItem("folder", 1, 1, 0)).rejects.toMatchObject({ code: "FOLDER_MOVE_INVALID" })
            })
            expect(result.current.isLoading).toBe(false)
        })

        it("forwards the trash methods", async () => {
            const items = [{ type: "note", id: 1, name: "n", context: "", deleted_at: "2026-01-01" }]
            vi.mocked(getDBTrash).mockResolvedValue(items as never)
            const { result } = renderHook(() => useAll(), { wrapper })
            await act(async () => {
                expect(await result.current.getTrash(4)).toBe(items)
                await result.current.restoreItem("note", 1)
                await result.current.purgeItem("folder", 2)
                await result.current.emptyTrash(4)
            })
            expect(getDBTrash).toHaveBeenCalledWith(4)
            expect(restoreDBItem).toHaveBeenCalledWith("note", 1)
            expect(purgeDBItem).toHaveBeenCalledWith("folder", 2)
            expect(emptyDBTrash).toHaveBeenCalledWith(4)
        })

        it("increments trashVersion after every successful trash-changing operation", async () => {
            const { result } = renderHook(() => useAll(), { wrapper })
            expect(result.current.trashVersion).toBe(0)
            let expected = 0
            const ops: Array<() => Promise<void>> = [
                () => result.current.deleteItem("task", 5),
                () => result.current.restoreItem("note", 1),
                () => result.current.purgeItem("folder", 2),
                () => result.current.emptyTrash(4),
                () => result.current.moveSection(4, 2, 1),
                () => result.current.moveSectionToNewGroup(4, 0),
                () => result.current.moveTask(9, { sectionId: 4, parentTaskId: null }, 0),
            ]
            for (const op of ops) {
                await act(() => op())
                expected += 1
                expect(result.current.trashVersion).toBe(expected)
            }
        })

        it("does not increment trashVersion when the operation fails or is unrelated", async () => {
            vi.mocked(deleteDBItem).mockRejectedValueOnce(new Error("nope"))
            const { result } = renderHook(() => useAll(), { wrapper })
            await act(async () => {
                await expect(result.current.deleteItem("task", 1)).rejects.toThrow("nope")
            })
            await act(() => result.current.createTask(1, "x"))
            await act(() => result.current.renameItem("task", 1, "y"))
            expect(result.current.trashVersion).toBe(0)
        })

        it("forwards createNoteInFolder with the workspace id", async () => {
            const { result } = renderHook(() => useAll(), { wrapper })
            await act(() => result.current.createNoteInFolder(1, 2, "x"))
            expect(createDBNoteInFolder).toHaveBeenCalledWith(1, 2, "x")
        })
    })

    describe("updateGroupsPositions", () => {
        it("persists the new positions", async () => {
            const { result } = renderHook(() => useAll(), { wrapper })
            const newGroups = [makeGroup({ id: 2, position: 0 }), makeGroup({ id: 1, position: 1 })]

            await act(() => result.current.updateGroupsPositions(newGroups))

            expect(updateDBGroupPositions).toHaveBeenCalledWith(newGroups)
        })

        it("rejects when the db update fails", async () => {
            vi.mocked(updateDBGroupPositions).mockRejectedValue(new Error("fail"))
            const { result } = renderHook(() => useAll(), { wrapper })

            await act(async () => {
                await expect(result.current.updateGroupsPositions([makeGroup({ id: 1 })])).rejects.toThrow("fail")
            })
            expect(result.current.isLoading).toBe(false)
        })
    })

    it("resetData closes every tab and clears the current folder", async () => {
        vi.mocked(getDBNoteData).mockResolvedValue({ groups: [], sections: [], tasks: [] } as never)
        vi.mocked(getDBWorkspaceData).mockResolvedValue({ folders: [], notes: [makeNote({ id: 1 })] } as never)
        const { result } = renderHook(() => useAll(), { wrapper })
        await act(() => result.current.getWorkspaceData(1))
        await act(async () => { result.current.openNote(1) })
        await waitFor(() => expect(result.current.noteDataTree).not.toBeNull())
        expect(result.current.currentNote).not.toBeNull()

        act(() => result.current.resetData())
        expect(result.current.currentNote).toBeNull()
        expect(result.current.tabs).toEqual([])
        expect(result.current.noteDataTree).toBeNull()
    })
})
