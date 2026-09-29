import type { ReactNode } from "react"
import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { WorkspaceDataProvider, useWorkspaceData } from "./workspace-data-context"
import { getDBWorkspaceData } from "@/db/queries/workspace"
import { getDBNoteData } from "@/db/queries/note"
import { updateDBGroupPositions } from "@/db/queries/group"
import { createDBTask } from "@/db/queries/task"
import { deleteDBItem, renameDBItem, updateDBColor } from "@/db/queries/shared_queries"
import { createDBSection } from "@/db/queries/section"
import { deferred } from "@/test/ui-render"
import { makeGroup, makeNote, makeSection, makeTask } from "@/test/ui-fixtures"
import type { Folder } from "@/types/types"

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
vi.mock("@/db/queries/shared_queries", () => ({
    renameDBItem: vi.fn(),
    updateDBColor: vi.fn(),
    deleteDBItem: vi.fn(),
}))

const wrapper = ({ children }: { children: ReactNode }) => <WorkspaceDataProvider>{children}</WorkspaceDataProvider>

const makeFolder = (over: Partial<Folder>): Folder => ({
    id: 1,
    workspaceID: 1,
    folderID: null,
    name: "F",
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
        expect(() => renderHook(() => useWorkspaceData())).toThrow(/WorkspaceDataProvider/)
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
            const { result } = renderHook(() => useWorkspaceData(), { wrapper })

            await act(() => result.current.getWorkspaceData(1))

            const tree = result.current.workspaceDataTree!
            expect(tree.rootFolders.map(f => f.id)).toEqual([1])
            expect(tree.rootFolders[0].subfolders.map(f => f.id)).toEqual([2])
            expect(tree.rootFolders[0].subfolders[0].notes.map(n => n.id)).toEqual([10])
            expect(tree.rootNotes.map(n => n.id)).toEqual([11])
        })

        it("handles an empty result", async () => {
            vi.mocked(getDBWorkspaceData).mockResolvedValue(undefined as never)
            const { result } = renderHook(() => useWorkspaceData(), { wrapper })
            await act(() => result.current.getWorkspaceData(1))
            expect(result.current.workspaceDataTree).toEqual({ rootFolders: [], rootNotes: [] })
        })

        it("sets the error, rethrows and resets isLoading on failure", async () => {
            vi.mocked(getDBWorkspaceData).mockRejectedValue(new Error("boom"))
            const { result } = renderHook(() => useWorkspaceData(), { wrapper })

            await act(async () => {
                await expect(result.current.getWorkspaceData(1)).rejects.toThrow("boom")
            })
            expect(result.current.error).toBe("Errore caricamento dati del Workspace")
            expect(result.current.isLoading).toBe(false)
        })
    })

    describe("getNoteData", () => {
        it("builds the note tree with sections, tasks and subtasks", async () => {
            vi.mocked(getDBNoteData).mockResolvedValue({
                groups: [makeGroup({ id: 1 })],
                sections: [makeSection({ id: 5, groupID: 1 })],
                tasks: [
                    makeTask({ id: 100, sectionID: 5, taskID: null }),
                    makeTask({ id: 101, sectionID: 5, taskID: 100 }),
                ],
            } as never)
            const { result } = renderHook(() => useWorkspaceData(), { wrapper })

            await act(() => result.current.getNoteData(1))

            const section = result.current.noteDataTree!.groups[0].sections[0]
            expect(section.tasks.map(t => t.id)).toEqual([100])
            expect(section.tasks[0].subtasks.map(t => t.id)).toEqual([101])
            expect(result.current.groups).toHaveLength(1)
            expect(result.current.tasks).toHaveLength(2)
        })

        it("sets the error and rethrows on failure", async () => {
            vi.mocked(getDBNoteData).mockRejectedValue(new Error("nope"))
            const { result } = renderHook(() => useWorkspaceData(), { wrapper })

            await act(async () => {
                await expect(result.current.getNoteData(1)).rejects.toThrow("nope")
            })
            expect(result.current.error).toBe("Errore caricamento dati nota")
        })
    })

    describe("isLoading counter", () => {
        it("stays true until all overlapping operations settle", async () => {
            const a = deferred()
            const b = deferred()
            vi.mocked(createDBTask).mockReturnValueOnce(a.promise as never)
            vi.mocked(createDBSection).mockReturnValueOnce(b.promise as never)
            const { result } = renderHook(() => useWorkspaceData(), { wrapper })

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
            const { result } = renderHook(() => useWorkspaceData(), { wrapper })
            await act(() => result.current.createTask(3, "hello"))
            expect(createDBTask).toHaveBeenCalledWith(3, "hello")
        })

        it("forwards renameItem and propagates errors", async () => {
            vi.mocked(renameDBItem).mockRejectedValueOnce(new Error("rename failed"))
            const { result } = renderHook(() => useWorkspaceData(), { wrapper })

            await act(async () => {
                await expect(result.current.renameItem("task", 4, "new")).rejects.toThrow("rename failed")
            })
            expect(renameDBItem).toHaveBeenCalledWith("task", 4, "new")
            expect(result.current.isLoading).toBe(false)
        })

        it("forwards deleteItem and updateItemColor", async () => {
            const { result } = renderHook(() => useWorkspaceData(), { wrapper })
            await act(async () => {
                await result.current.deleteItem("note", 9)
                await result.current.updateItemColor("note", 9, "#000")
            })
            expect(deleteDBItem).toHaveBeenCalledWith("note", 9)
            expect(updateDBColor).toHaveBeenCalledWith("note", 9, "#000")
        })
    })

    describe("updateGroupsPositions", () => {
        it("persists and updates groups and the note tree", async () => {
            const { result } = renderHook(() => useWorkspaceData(), { wrapper })
            const newGroups = [makeGroup({ id: 2, position: 0 }), makeGroup({ id: 1, position: 1 })]

            await act(() => result.current.updateGroupsPositions(newGroups))

            expect(updateDBGroupPositions).toHaveBeenCalledWith(newGroups)
            expect(result.current.groups.map(g => g.id)).toEqual([2, 1])
            expect(result.current.noteDataTree!.groups.map(g => g.id)).toEqual([2, 1])
        })

        it("leaves state untouched when the db update fails", async () => {
            vi.mocked(updateDBGroupPositions).mockRejectedValue(new Error("fail"))
            const { result } = renderHook(() => useWorkspaceData(), { wrapper })

            await act(async () => {
                await expect(result.current.updateGroupsPositions([makeGroup({ id: 1 })])).rejects.toThrow("fail")
            })
            expect(result.current.groups).toEqual([])
            expect(result.current.noteDataTree).toBeNull()
        })
    })

    it("resetData clears note related state", () => {
        const { result } = renderHook(() => useWorkspaceData(), { wrapper })
        act(() => {
            result.current.setCurrentNote(makeNote())
            result.current.setGroups([makeGroup()])
        })
        expect(result.current.currentNote).not.toBeNull()

        act(() => result.current.resetData())
        expect(result.current.currentNote).toBeNull()
        expect(result.current.groups).toEqual([])
        expect(result.current.noteDataTree).toBeNull()
    })
})
