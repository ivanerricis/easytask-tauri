import { act, render, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { TabsProvider, useActiveNoteId, useGroupOpen, useSectionOpen, useTabs, useTabsActions } from "./tabs-context"
import { getReopenNotes } from "@/lib/store/preferences"
import { getWorkspaceTabs, saveWorkspaceTabs } from "@/lib/store/tabs"
import { makeNote } from "@/test/ui-fixtures"
import type { Note } from "@/types/types"

vi.mock("@/lib/store/preferences", () => ({ getReopenNotes: vi.fn() }))
vi.mock("@/lib/store/tabs", () => ({ getWorkspaceTabs: vi.fn(), saveWorkspaceTabs: vi.fn() }))

const notesOf = (...ids: number[]) => ids.map(id => makeNote({ id, name: `Nota ${id}` }))

type Props = { notes: Note[], workspaceId: number | null }

/** Renders the provider with a probe; the props can be changed through update (renderHook cannot change the wrapper props). */
function harness(initial: Props) {
    const latest: { current: ReturnType<typeof useAllHooks> } = { current: undefined as never }
    function useAllHooks() {
        return { ...useTabs(), ...useTabsActions() }
    }
    function Probe() {
        latest.current = useAllHooks()
        return null
    }
    const ui = (props: Props) => <TabsProvider notes={props.notes} workspaceId={props.workspaceId}><Probe /></TabsProvider>
    const view = render(ui(initial))
    return { latest, update: (props: Props) => view.rerender(ui(props)) }
}

describe("TabsProvider", () => {
    beforeEach(() => {
        vi.resetAllMocks()
        vi.spyOn(console, "error").mockImplementation(() => {})
        vi.mocked(getReopenNotes).mockResolvedValue(true)
        vi.mocked(getWorkspaceTabs).mockResolvedValue({ openIds: [], activeId: null })
        vi.mocked(saveWorkspaceTabs).mockResolvedValue(undefined)
    })

    it("throws when the hooks are used outside the provider", () => {
        expect(() => renderHook(() => useTabs())).toThrow(/TabsProvider/)
        expect(() => renderHook(() => useTabsActions())).toThrow(/TabsProvider/)
        expect(renderHook(() => useActiveNoteId()).result.current).toBeNull()
    })

    it("opens, activates and closes tabs, deriving the notes from the live list", () => {
        const { latest } = harness({ notes: notesOf(1, 2, 3), workspaceId: null })

        act(() => { latest.current.openNote(1); latest.current.openNote(2); latest.current.openNote(3) })
        expect(latest.current.tabs.map(n => n.id)).toEqual([1, 2, 3])
        expect(latest.current.currentNote?.id).toBe(3)

        act(() => latest.current.activateNote(1))
        expect(latest.current.activeId).toBe(1)

        act(() => latest.current.closeNote(1))
        expect(latest.current.tabs.map(n => n.id)).toEqual([2, 3])
        expect(latest.current.activeId).toBe(2)

        act(() => latest.current.reorderTabs(0, 1))
        expect(latest.current.openIds).toEqual([3, 2])

        act(() => latest.current.closeAllNotes())
        expect(latest.current.tabs).toEqual([])
        expect(latest.current.currentNote).toBeNull()
    })

    it("reflects a rename or a recolor of an open note in its tab", () => {
        const { latest, update } = harness({ notes: notesOf(1, 2), workspaceId: null })
        act(() => { latest.current.openNote(1); latest.current.openNote(2) })
        expect(latest.current.tabs[1].name).toBe("Nota 2")

        update({ workspaceId: null, notes: [makeNote({ id: 1, name: "Nota 1" }), makeNote({ id: 2, name: "Rinominata", color: "#ff0000" })] })

        expect(latest.current.tabs.map(n => n.name)).toEqual(["Nota 1", "Rinominata"])
        expect(latest.current.currentNote?.name).toBe("Rinominata")
        expect(latest.current.currentNote?.color).toBe("#ff0000")
    })

    it("closes the tabs of notes that disappear from the list, picking the neighbour", () => {
        const { latest, update } = harness({ notes: notesOf(1, 2, 3), workspaceId: null })
        act(() => { latest.current.openNote(1); latest.current.openNote(2); latest.current.openNote(3); latest.current.activateNote(2) })

        update({ workspaceId: null, notes: notesOf(1, 3) })

        expect(latest.current.openIds).toEqual([1, 3])
        expect(latest.current.activeId).toBe(3)
    })

    it("keeps the action identities stable across state changes", () => {
        const { latest } = harness({ notes: notesOf(1, 2), workspaceId: null })
        const before = { ...latest.current }
        act(() => latest.current.openNote(1))
        act(() => latest.current.openNote(2))
        for (const key of ["openNote", "closeNote", "closeNotes", "closeActiveNote", "closeAllNotes", "reorderTabs", "activateNote"] as const)
            expect(latest.current[key]).toBe(before[key])
    })

    describe("persistence", () => {
        it("restores the saved tabs and the active one, dropping the notes that no longer exist", async () => {
            vi.mocked(getWorkspaceTabs).mockResolvedValue({ openIds: [3, 99, 1], activeId: 1 })
            const { latest } = harness({ notes: notesOf(1, 2, 3), workspaceId: 7 })

            await waitFor(() => expect(latest.current.openIds).toEqual([3, 1]))
            expect(getWorkspaceTabs).toHaveBeenCalledWith(7)
            expect(latest.current.activeId).toBe(1)
        })

        it("falls back to the first tab when the saved active note no longer exists", async () => {
            vi.mocked(getWorkspaceTabs).mockResolvedValue({ openIds: [2, 3], activeId: 99 })
            const { latest } = harness({ notes: notesOf(1, 2, 3), workspaceId: 7 })

            await waitFor(() => expect(latest.current.openIds).toEqual([2, 3]))
            expect(latest.current.activeId).toBe(2)
        })

        it("does not restore when the preference is off, but still saves the tabs", async () => {
            vi.mocked(getReopenNotes).mockResolvedValue(false)
            vi.mocked(getWorkspaceTabs).mockResolvedValue({ openIds: [1], activeId: 1 })
            const { latest } = harness({ notes: notesOf(1, 2), workspaceId: 7 })

            await waitFor(() => expect(getReopenNotes).toHaveBeenCalled())
            await act(async () => { await Promise.resolve() })
            expect(getWorkspaceTabs).not.toHaveBeenCalled()
            expect(latest.current.openIds).toEqual([])

            act(() => latest.current.openNote(2))
            await waitFor(() => expect(saveWorkspaceTabs).toHaveBeenLastCalledWith(7, { openIds: [2], activeId: 2 }))
        })

        it("saves every change per workspace, and never before the saved tabs have been read", async () => {
            let release!: (tabs: { openIds: number[], activeId: number | null }) => void
            vi.mocked(getWorkspaceTabs).mockReturnValue(new Promise(resolve => { release = resolve }))
            const { latest } = harness({ notes: notesOf(1, 2), workspaceId: 7 })

            act(() => latest.current.openNote(2))
            await act(async () => { await Promise.resolve() })
            expect(saveWorkspaceTabs).not.toHaveBeenCalled()

            await act(async () => { release({ openIds: [1], activeId: 1 }) })
            // The tab opened by the user in the meantime wins over the saved ones
            await waitFor(() => expect(saveWorkspaceTabs).toHaveBeenLastCalledWith(7, { openIds: [2], activeId: 2 }))
            expect(latest.current.openIds).toEqual([2])
        })

        it("resets and restores again when the workspace changes", async () => {
            vi.mocked(getWorkspaceTabs).mockImplementation(async id =>
                id === 7 ? { openIds: [1], activeId: 1 } : { openIds: [11], activeId: 11 })
            const { latest, update } = harness({ notes: notesOf(1), workspaceId: 7 })
            await waitFor(() => expect(latest.current.openIds).toEqual([1]))

            update({ notes: notesOf(11, 12), workspaceId: 8 })

            await waitFor(() => expect(latest.current.openIds).toEqual([11]))
            expect(latest.current.activeId).toBe(11)
            // The tabs of workspace 7 are not saved under workspace 8
            expect(saveWorkspaceTabs).not.toHaveBeenCalledWith(8, { openIds: [1], activeId: 1 })
        })

        it("closes every tab when the workspace is unloaded", async () => {
            vi.mocked(getWorkspaceTabs).mockResolvedValue({ openIds: [1, 2], activeId: 2 })
            const { latest, update } = harness({ notes: notesOf(1, 2), workspaceId: 7 })
            await waitFor(() => expect(latest.current.openIds).toEqual([1, 2]))

            update({ notes: notesOf(1, 2), workspaceId: null })

            await waitFor(() => expect(latest.current.openIds).toEqual([]))
            expect(saveWorkspaceTabs).not.toHaveBeenCalledWith(7, { openIds: [], activeId: null })
        })

        it("survives a store failure", async () => {
            vi.mocked(getWorkspaceTabs).mockRejectedValue(new Error("store down"))
            const { latest } = harness({ notes: notesOf(1), workspaceId: 7 })

            await waitFor(() => expect(console.error).toHaveBeenCalled())
            act(() => latest.current.openNote(1))
            expect(latest.current.openIds).toEqual([1])
        })
    })

    describe("useSectionOpen", () => {
        it("keeps the collapsed state per note across tab switches and drops it when the tab is closed", () => {
            const wrapper = ({ children }: { children: ReactNode }) =>
                <TabsProvider notes={notesOf(1, 2)} workspaceId={null}>{children}</TabsProvider>
            const { result } = renderHook(() => ({ section: useSectionOpen(5), other: useSectionOpen(6), ...useTabsActions() }), { wrapper })

            act(() => { result.current.openNote(1) })
            expect(result.current.section[0]).toBe(true)

            act(() => result.current.section[1]())
            expect(result.current.section[0]).toBe(false)
            expect(result.current.other[0]).toBe(true)

            act(() => result.current.openNote(2))
            expect(result.current.section[0]).toBe(true) // same section id, other note

            act(() => result.current.activateNote(1))
            expect(result.current.section[0]).toBe(false) // restored

            act(() => result.current.closeNote(1))
            act(() => result.current.openNote(1))
            expect(result.current.section[0]).toBe(true) // state of a closed tab is dropped
        })
    })

    describe("useGroupOpen", () => {
        it("keeps the collapsed state per note and drops it when the tab is closed", () => {
            const wrapper = ({ children }: { children: ReactNode }) =>
                <TabsProvider notes={notesOf(1, 2)} workspaceId={null}>{children}</TabsProvider>
            const { result } = renderHook(() => ({ group: useGroupOpen(5), section: useSectionOpen(5), ...useTabsActions() }), { wrapper })

            act(() => { result.current.openNote(1) })
            expect(result.current.group[0]).toBe(true)

            act(() => result.current.group[1]())
            expect(result.current.group[0]).toBe(false)
            expect(result.current.section[0]).toBe(true) // independent from sections

            act(() => result.current.openNote(2))
            expect(result.current.group[0]).toBe(true)

            act(() => result.current.activateNote(1))
            expect(result.current.group[0]).toBe(false)

            act(() => result.current.closeNote(1))
            act(() => result.current.openNote(1))
            expect(result.current.group[0]).toBe(true)
        })
    })
})
