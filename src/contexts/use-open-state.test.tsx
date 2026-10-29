import { act, renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { TabsProvider } from "./tabs-context"
import { createNoteOptimisticActions } from "./note-optimistic"
import { useGroupOpen, useSectionOpen, useSubtasksOpen, useTabUiStore, useTabsActions } from "./use-tabs"
import { reportError } from "@/lib/report-error"
import { getReopenNotes } from "@/lib/store/preferences"
import { getWorkspaceTabs, saveWorkspaceTabs } from "@/lib/store/tabs"
import { makeGroup, makeNote, makeSection, makeTask } from "@/test/ui-fixtures"
import type { NoteDataTree } from "@/types/types"

vi.mock("@/lib/store/preferences", () => ({ getReopenNotes: vi.fn() }))
vi.mock("@/lib/store/tabs", () => ({ getWorkspaceTabs: vi.fn(), saveWorkspaceTabs: vi.fn() }))
vi.mock("@/lib/report-error", async importOriginal => ({ ...(await importOriginal<typeof import("@/lib/report-error")>()), reportError: vi.fn() }))

// A small fake of the cache of the note data, driven by the real optimistic actions, plus the (mocked) database action
const trees = new Map<number, NoteDataTree>()
const listeners = new Set<() => void>()
let activeId: number | null = null
const setCollapsed = vi.fn()

const optimistic = createNoteOptimisticActions({
    active: () => (activeId !== null && trees.has(activeId) ? { id: activeId, tree: trees.get(activeId)! } : null),
    get: id => trees.get(id),
    commit: (id, tree) => { trees.set(id, tree); listeners.forEach(listener => listener()) },
})

vi.mock("./use-active-note", () => ({
    useActiveNoteActions: () => ({
        ...optimistic,
        getCachedNoteTree: (id: number) => trees.get(id) ?? null,
        subscribeNoteTree: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } },
    }),
}))
vi.mock("./workspace-data/context", () => ({ useWorkspaceActions: () => ({ setCollapsed }) }))

const makeTree = (): NoteDataTree => ({
    groups: [makeGroup({
        id: 5, sections: [makeSection({ id: 10, tasks: [makeTask({ id: 1, subtasks: [makeTask({ id: 2, taskID: 1 })] })] }), makeSection({ id: 11 })],
    })],
})

const wrapper = ({ children }: { children: ReactNode }) =>
    <TabsProvider notes={[makeNote({ id: 1 }), makeNote({ id: 2 })]} workspaceId={null}>{children}</TabsProvider>

/** The hooks under test, with the active note kept in sync with the tabs (as the active note provider does). */
function setup() {
    const view = renderHook(() => {
        const actions = useTabsActions()
        return { group: useGroupOpen(5), section: useSectionOpen(10), other: useSectionOpen(11), subtasks: useSubtasksOpen(1), leaf: useSubtasksOpen(2), ui: useTabUiStore(), ...actions }
    }, { wrapper })
    const open = (id: number) => {
        activeId = id
        act(() => view.result.current.openNote(id))
    }
    return { ...view, open }
}

beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(console, "error").mockImplementation(() => {})
    vi.mocked(getReopenNotes).mockResolvedValue(true)
    vi.mocked(getWorkspaceTabs).mockResolvedValue({ left: { openIds: [], activeId: null }, right: null, focused: 0 })
    vi.mocked(saveWorkspaceTabs).mockResolvedValue(undefined)
    setCollapsed.mockResolvedValue(undefined)
    trees.clear()
    listeners.clear()
    activeId = null
    trees.set(1, makeTree())
    trees.set(2, makeTree())
})

describe("useGroupOpen / useSectionOpen / useSubtasksOpen", () => {
    it("is open when the element is not saved as closed, also without an active note", () => {
        const { result } = setup()
        expect(result.current.group[0]).toBe(true)
        expect(result.current.section[0]).toBe(true)
        expect(result.current.subtasks[0]).toBe(true)
        act(() => result.current.group[1]())
        expect(setCollapsed).not.toHaveBeenCalled()
    })

    it("reads the saved state (true or 1) of the active note", () => {
        trees.get(1)!.groups[0].collapsed = 1
        trees.get(1)!.groups[0].sections[0].collapsed = true
        trees.get(1)!.groups[0].sections[0].tasks[0].collapsed = 1
        const { result, open } = setup()
        open(1)
        expect([result.current.group[0], result.current.section[0], result.current.other[0], result.current.subtasks[0], result.current.leaf[0]]).toEqual([false, false, true, false, true])
    })

    it("a toggle updates the note at once and saves the new state, not as an undo step", async () => {
        const { result, open } = setup()
        open(1)
        await act(async () => { result.current.section[1]() })
        expect(result.current.section[0]).toBe(false)
        expect(result.current.other[0]).toBe(true)
        expect(trees.get(1)!.groups[0].sections[0].collapsed).toBe(true)
        expect(setCollapsed).toHaveBeenLastCalledWith("section", 10, true)
        await act(async () => { result.current.section[1]() })
        expect(result.current.section[0]).toBe(true)
        expect(setCollapsed).toHaveBeenLastCalledWith("section", 10, false)
        await act(async () => { result.current.group[1]() })
        expect(setCollapsed).toHaveBeenLastCalledWith("group", 5, true)
        await act(async () => { result.current.subtasks[1]() })
        expect(setCollapsed).toHaveBeenLastCalledWith("task", 1, true)
        expect(result.current.subtasks[0]).toBe(false)
        expect(setCollapsed).toHaveBeenCalledTimes(4)
    })

    it("keeps the state per note: the same ids in another note are not touched", async () => {
        const { result, open } = setup()
        open(1)
        await act(async () => { result.current.group[1]() })
        expect(result.current.group[0]).toBe(false)
        open(2)
        expect(result.current.group[0]).toBe(true)
        act(() => result.current.activateNote(1))
        activeId = 1
        expect(result.current.group[0]).toBe(false)
    })

    it("keeps the state when the tab is closed and opened again (it is saved in the note)", async () => {
        const { result, open } = setup()
        open(1)
        await act(async () => { result.current.group[1]() })
        act(() => result.current.closeNote(1))
        open(1)
        expect(result.current.group[0]).toBe(false)
    })

    it("a failed save restores the previous state and reports the error", async () => {
        setCollapsed.mockRejectedValueOnce(new Error("disk full"))
        const { result, open } = setup()
        open(1)
        await act(async () => { result.current.section[1]() })
        expect(result.current.section[0]).toBe(true)
        expect(trees.get(1)!.groups[0].sections[0].collapsed).toBeFalsy()
        expect(reportError).toHaveBeenCalledWith(expect.any(Error), expect.stringContaining("disk full"))
    })

    it("a failed save of an opening closes it back", async () => {
        trees.get(1)!.groups[0].collapsed = true
        setCollapsed.mockRejectedValueOnce(new Error("nope"))
        const { result, open } = setup()
        open(1)
        expect(result.current.group[0]).toBe(false)
        await act(async () => { result.current.group[1]() })
        expect(result.current.group[0]).toBe(false)
        expect(trees.get(1)!.groups[0].collapsed).toBe(true)
    })

    describe("opened by the search", () => {
        it("a closed element the search revealed is open, and nothing is saved", () => {
            trees.get(1)!.groups[0].collapsed = true
            trees.get(1)!.groups[0].sections[0].tasks[0].collapsed = true
            const { result, open } = setup()
            open(1)
            expect(result.current.group[0]).toBe(false)
            act(() => { result.current.ui.setRevealed(1, "group", 5, true); result.current.ui.setRevealed(1, "task", 1, true) })
            expect(result.current.group[0]).toBe(true)
            expect(result.current.subtasks[0]).toBe(true)
            expect(result.current.section[0]).toBe(true)
            expect(setCollapsed).not.toHaveBeenCalled()
            expect(trees.get(1)!.groups[0].collapsed).toBe(true)
            act(() => result.current.ui.clearRevealed(1))
            expect(result.current.group[0]).toBe(false)
            expect(result.current.subtasks[0]).toBe(false)
        })

        it("a toggle of a revealed element closes it without writing (it was already saved closed)", async () => {
            trees.get(1)!.groups[0].collapsed = true
            const { result, open } = setup()
            open(1)
            act(() => result.current.ui.setRevealed(1, "group", 5, true))
            expect(result.current.group[0]).toBe(true)
            await act(async () => { result.current.group[1]() })
            expect(result.current.group[0]).toBe(false)
            expect(setCollapsed).not.toHaveBeenCalled()
            // and the next one opens it for real
            await act(async () => { result.current.group[1]() })
            expect(result.current.group[0]).toBe(true)
            expect(setCollapsed).toHaveBeenCalledWith("group", 5, false)
        })

        it("the reveals of a closed tab are dropped", () => {
            const { result, open } = setup()
            open(1)
            act(() => result.current.ui.setRevealed(1, "section", 10, true))
            expect(result.current.ui.isRevealed(1, "section", 10)).toBe(true)
            act(() => result.current.closeNote(1))
            expect(result.current.ui.isRevealed(1, "section", 10)).toBe(false)
        })
    })
})
