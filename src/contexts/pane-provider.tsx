import { useCallback, useContext, useMemo, useRef, useSyncExternalStore, type ReactNode } from "react"
import { ActiveNoteActionsContext, ActiveNoteContext } from "./active-note-context-object"
import { ActiveIdContext, ActiveIdStoreContext, TabsActionsContext, TabsContext } from "./tabs-context-object"
import {
    FocusedPaneStoreContext,
    PaneContext,
    PaneNoteActionsContext,
    PaneNoteTreesContext,
    PaneTabsContext,
    type PaneContextType,
} from "./layout-context-object"
import type { PaneIndex } from "./layout-reducer"

/**
 * Makes the hooks of the tabs and of the active note (`useTabs`, `useTabsActions`, `useActiveNoteId`, `useActiveNote`,
 * `useActiveNoteActions`, ...) return the values of one pane for its whole subtree, and provides `PaneContext`.
 * It renders no element: the layout attaches `usePane()!.rootRef` to the root element of the pane.
 * Without a layout provider (no `PaneTabsContext`) it is a pure passthrough.
 * @category Panes
 */
export function PaneProvider({ pane, children }: { pane: PaneIndex, children: ReactNode }) {
    const paneTabs = useContext(PaneTabsContext)
    const paneTrees = useContext(PaneNoteTreesContext)
    const paneActions = useContext(PaneNoteActionsContext)
    const focusStore = useContext(FocusedPaneStoreContext)
    const rootRef = useRef<HTMLDivElement | null>(null)
    const focused = useSyncExternalStore(focusStore.subscribe, () => focusStore.getState() === pane)

    const isFocused = useCallback(() => focusStore.getState() === pane, [focusStore, pane])
    const paneContext = useMemo<PaneContextType>(() => ({ pane, focused, isFocused, rootRef }), [pane, focused, isFocused])

    const tree = paneTrees?.[pane] ?? null
    // Stable while the tree is the same, so a focus change does not re-render the note data consumers
    const noteData = useMemo(() => ({ noteDataTree: tree }), [tree])

    if (!paneTabs) return <>{children}</>
    const mine = paneTabs[pane]
    const actions = paneActions?.[pane] ?? null

    let content = children
    if (actions) {
        content = (
            <ActiveNoteActionsContext.Provider value={actions}>
                <ActiveNoteContext.Provider value={noteData}>{content}</ActiveNoteContext.Provider>
            </ActiveNoteActionsContext.Provider>
        )
    }
    return (
        <PaneContext.Provider value={paneContext}>
            <TabsContext.Provider value={mine.tabs}>
                <TabsActionsContext.Provider value={mine.actions}>
                    <ActiveIdContext.Provider value={mine.tabs.activeId}>
                        <ActiveIdStoreContext.Provider value={mine.activeStore}>{content}</ActiveIdStoreContext.Provider>
                    </ActiveIdContext.Provider>
                </TabsActionsContext.Provider>
            </TabsContext.Provider>
        </PaneContext.Provider>
    )
}
