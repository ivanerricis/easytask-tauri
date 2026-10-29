import { act, render, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { ReactNode } from "react"
import { createExternalStore } from "@/lib/external-store"
import { SplitHarness } from "@/test/split-harness"
import { noopActions, tabsValue, type SplitState } from "@/test/split-fixtures"
import { ActiveNoteProvider } from "./active-note-context"
import { PaneProvider } from "./pane-provider"
import { useActiveNote, useActiveNoteActions } from "./use-active-note"
import { useActiveNoteId, useActiveNoteSelector, useTabs, useTabsActions } from "./use-tabs"
import { useIsFocusedPane, usePane, usePaneFocusGetter } from "./use-layout"
import type { PaneIndex } from "@/lib/tabs/layout-reducer"
import { TabsActionsContext, TabsContext, ActiveIdContext } from "./tabs-context-object"

vi.mock("@/db/queries/note", () => ({ getDBNoteData: vi.fn(async () => ({ groups: [], sections: [], tasks: [] })) }))

const state: SplitState = { open0: [1, 3], active0: 1, open1: [2], active1: 2, focused: 0 }
const actions1 = { ...noopActions, openNote: vi.fn() }

const wrapper = (pane: PaneIndex, focusStore = createExternalStore<PaneIndex>(0)) =>
    function Wrapper({ children }: { children: ReactNode }) {
        return (
            <SplitHarness state={state} actions1={actions1} focusStore={focusStore}>
                <ActiveNoteProvider><PaneProvider pane={pane}>{children}</PaneProvider></ActiveNoteProvider>
            </SplitHarness>
        )
    }

describe("PaneProvider", () => {
    it("overrides the tabs and active note hooks with the ones of its pane", () => {
        const { result } = renderHook(() => ({
            tabs: useTabs(), actions: useTabsActions(), id: useActiveNoteId(), selected: useActiveNoteSelector(id => id),
            note: useActiveNote(), noteActions: useActiveNoteActions(),
        }), { wrapper: wrapper(1) })
        expect(result.current.tabs.openIds).toEqual([2])
        expect(result.current.tabs.activeId).toBe(2)
        expect(result.current.id).toBe(2)
        expect(result.current.selected).toBe(2)
        expect(result.current.actions).toBe(actions1)
        expect(result.current.note.noteDataTree).toBeNull()
        expect(typeof result.current.noteActions.patchTask).toBe("function")
    })

    it("gives each pane its own values, while the hooks outside see the union and the focused pane", () => {
        const outside = renderHook(() => ({ tabs: useTabs(), id: useActiveNoteId() }), { wrapper: wrapper(0) })
        const left = renderHook(() => useTabs().openIds, { wrapper: wrapper(0) })
        expect(left.result.current).toEqual([1, 3])
        expect(outside.result.current.id).toBe(1)
    })

    it("exposes the pane, a root ref and a stable focus getter", () => {
        const { result, rerender } = renderHook(() => usePane()!, { wrapper: wrapper(1) })
        expect(result.current.pane).toBe(1)
        expect(result.current.rootRef.current).toBeNull()
        const first = result.current
        rerender()
        expect(result.current.rootRef).toBe(first.rootRef)
        expect(result.current.isFocused).toBe(first.isFocused)
    })

    it("follows the focused pane store", () => {
        const store = createExternalStore<PaneIndex>(0)
        const { result } = renderHook(() => ({ flag: useIsFocusedPane(), get: usePaneFocusGetter() }), { wrapper: wrapper(1, store) })
        const getter = result.current.get
        expect(result.current.flag).toBe(false)
        expect(getter()).toBe(false)

        act(() => store.set(1))
        expect(result.current.flag).toBe(true)
        expect(result.current.get).toBe(getter)
        expect(getter()).toBe(true)

        act(() => store.set(0))
        expect(result.current.flag).toBe(false)
    })

    it("does not re-render a note data consumer when only the focus changes", () => {
        const store = createExternalStore<PaneIndex>(0)
        let renders = 0
        function Probe() {
            useActiveNote()
            renders++
            return null
        }
        const probe = <Probe />
        const Wrap = wrapper(1, store)
        render(<Wrap>{probe}</Wrap>)
        const before = renders
        act(() => store.set(1))
        act(() => store.set(0))
        expect(renders).toBe(before)
    })

    it("is a pure passthrough without a layout provider", () => {
        const tabs = tabsValue([5], 5)
        const { result } = renderHook(() => ({ tabs: useTabs(), id: useActiveNoteId(), pane: usePane(), actions: useTabsActions() }), {
            wrapper: ({ children }) => (
                <TabsContext.Provider value={tabs}>
                    <TabsActionsContext.Provider value={noopActions}>
                        <ActiveIdContext.Provider value={5}><PaneProvider pane={1}>{children}</PaneProvider></ActiveIdContext.Provider>
                    </TabsActionsContext.Provider>
                </TabsContext.Provider>
            ),
        })
        expect(result.current.tabs).toBe(tabs)
        expect(result.current.id).toBe(5)
        expect(result.current.actions).toBe(noopActions)
        expect(result.current.pane).toBeNull()
    })

    it("renders its children", () => {
        const { getByText } = render(<PaneProvider pane={0}><span>hi</span></PaneProvider>)
        expect(getByText("hi")).toBeTruthy()
    })
})
