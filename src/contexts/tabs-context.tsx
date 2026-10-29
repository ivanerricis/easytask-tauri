import { useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from "react"
import type { MutableRefObject } from "react"
import type { Note } from "@/types/types"
import type { TabsBridge } from "./workspace-data/types"
import {
    FocusedPaneStoreContext, IsSplitStoreContext, LayoutActionsContext, LayoutContext, PaneTabsContext,
    type LayoutActionsType, type LayoutContextType, type PaneTabsValue,
} from "./layout-context-object"
import {
    focusedPane, initialLayoutState, layoutReducer, normalizeLayout, unionOpenIds,
    type LayoutState, type PaneIndex,
} from "./layout-reducer"
import {
    ActiveIdContext, ActiveIdStoreContext, TabUiContext, TabsActionsContext, TabsContext,
    type ScrollPosition, type SelectedItem, type TabUiStore, type TabsActionsType, type TabsContextType,
} from "./tabs-context-object"
import { initialTabsState, type TabsState } from "./tabs-reducer"
import { createExternalStore } from "@/lib/external-store"
import { reportError } from "@/lib/report-error"
import { getReopenNotes } from "@/lib/store/preferences"
import { getWorkspaceTabs, saveWorkspaceTabs } from "@/lib/store/tabs"

/* ------------------------------------------------------------------------------------ */

/**
 * Creates the store of the per-note UI state.
 * @returns The store.
 * @category Tabs
 */
function createTabUiStore(): TabUiStore {
    const revealed = new Map<number, Set<string>>()
    const scroll = new Map<number, ScrollPosition>()
    const selected = new Map<number, SelectedItem>()
    const listeners = new Set<() => void>()
    const emit = () => listeners.forEach(listener => listener())

    return {
        isRevealed: (noteId, kind, id) => revealed.get(noteId)?.has(`${kind}-${id}`) ?? false,
        setRevealed: (noteId, kind, id, value) => {
            const set = revealed.get(noteId) ?? new Set<string>()
            const key = `${kind}-${id}`
            if (set.has(key) === value) return
            if (value) set.add(key)
            else set.delete(key)
            revealed.set(noteId, set)
            emit()
        },
        clearRevealed: noteId => {
            if (!revealed.get(noteId)?.size) return
            revealed.delete(noteId)
            emit()
        },
        getSelectedItem: noteId => selected.get(noteId) ?? null,
        setSelectedItem: (noteId, item) => {
            const current = selected.get(noteId)
            if (!item) {
                if (!current) return
                selected.delete(noteId)
            } else {
                if (current?.type === item.type && current.id === item.id) return
                selected.set(noteId, { type: item.type, id: item.id })
            }
            emit()
        },
        getScroll: noteId => scroll.get(noteId),
        setScroll: (noteId, position) => { scroll.set(noteId, position) },
        retain: keep => {
            const keepSet = new Set(keep)
            for (const id of [...revealed.keys()]) if (!keepSet.has(id)) revealed.delete(id)
            for (const id of [...selected.keys()]) if (!keepSet.has(id)) selected.delete(id)
            for (const id of [...scroll.keys()]) if (!keepSet.has(id)) scroll.delete(id)
        },
        subscribe: listener => {
            listeners.add(listener)
            return () => { listeners.delete(listener) }
        },
    }
}

/* ------------------------------------------------------------------------------------ */

type TabsProviderProps = {
    /** The live notes of the loaded workspace: the tabs are derived from it. */
    notes: Note[]
    /** The ID of the loaded workspace (null when none), used to save and restore the open tabs. */
    workspaceId: number | null
    /** Filled with the tabs bridge (layout snapshot and reopen), for the module that deletes notes. Optional. */
    bridgeRef?: MutableRefObject<TabsBridge | null>
    children: React.ReactNode
}

/** The tabs of a pane that exist in `existing`, with a valid active id. */
function filterPane(tabs: TabsState, existing: ReadonlySet<number>): TabsState {
    const openIds = tabs.openIds.filter(id => existing.has(id))
    const activeId = tabs.activeId !== null && openIds.includes(tabs.activeId) ? tabs.activeId : (openIds[0] ?? null)
    return { openIds, activeId }
}

/** The value of the tabs context for a pane (an absent pane is the empty state). */
function paneTabsValue(tabs: TabsState | null, byId: ReadonlyMap<number, Note>, restored: boolean): TabsContextType {
    const state = tabs ?? initialTabsState
    return {
        openIds: state.openIds,
        activeId: state.activeId,
        tabs: state.openIds.flatMap(id => byId.get(id) ?? []),
        currentNote: state.activeId !== null ? byId.get(state.activeId) ?? null : null,
        restored,
    }
}

/**
 * Manages the open note tabs of the (possibly split) workspace: up to two panes, each with its tabs (ids only, reducer
 * based). It restores them per workspace at startup and keeps the per-note UI state. Split in several contexts so
 * consumers re-render only for what they use. Outside the panes the tabs hooks see the union of the open notes and the
 * focused pane's active note; `PaneTabsContext` holds the values and the actions bound to each pane.
 * @category Tabs
 */
export function TabsProvider({ notes, workspaceId, bridgeRef, children }: TabsProviderProps) {
    const [state, dispatch] = useReducer(layoutReducer, initialLayoutState)
    const [uiStore] = useState(createTabUiStore)
    const [activeStore] = useState(() => createExternalStore<number | null>(null))
    const [focusedStore] = useState(() => createExternalStore<PaneIndex>(0))
    const [isSplitStore] = useState(() => createExternalStore<boolean>(false))
    const [paneStores] = useState(() => [createExternalStore<number | null>(null), createExternalStore<number | null>(null)] as const)
    const [restoredTick, setRestoredTick] = useState(0)
    const [restoredFor, setRestoredFor] = useState<number | null>(null)

    const notesRef = useRef(notes)
    const restoredRef = useRef(false)
    const restoreToken = useRef(0)
    const lastWorkspaceId = useRef<number | null>(null)
    const notesSeen = useRef(false)

    const stateRef = useRef<LayoutState>(state)

    const { left, right, focused } = state
    const isSplit = right !== null
    const active = focusedPane(state).activeId
    const openIds = useMemo(() => unionOpenIds({ left, right, focused }), [left, right, focused])

    useEffect(() => {
        notesRef.current = notes
    }, [notes])

    // Before paint, so the rows that read the stores never show a stale active note
    useLayoutEffect(() => {
        activeStore.set(active)
        focusedStore.set(focused)
        isSplitStore.set(isSplit)
        paneStores[0].set(left.activeId)
        paneStores[1].set(right?.activeId ?? null)
    }, [activeStore, focusedStore, isSplitStore, paneStores, active, focused, left.activeId, right?.activeId, isSplit])

    useEffect(() => {
        stateRef.current = state
    }, [state])

    useEffect(() => {
        if (!bridgeRef) return
        bridgeRef.current = {
            snapshot: () => stateRef.current,
            reopen: snapshot => dispatch({ type: "reopen", state: snapshot }),
        }
        return () => { bridgeRef.current = null }
    }, [bridgeRef])

    // Tabs of notes that no longer exist (deleted, trashed, other workspace) are closed with the usual neighbour rule
    useEffect(() => {
        // Nothing to prune before the first notes list arrives
        if (!notesSeen.current) {
            notesSeen.current = true
            return
        }
        dispatch({ type: "prune", existing: new Set(notes.map(note => note.id)) })
    }, [notes])

    // Reset on workspace change, then restore the layout saved for that workspace
    useEffect(() => {
        restoredRef.current = false
        const token = ++restoreToken.current
        if (lastWorkspaceId.current !== workspaceId) {
            lastWorkspaceId.current = workspaceId
            dispatch({ type: "restore", state: initialLayoutState })
        }
        if (workspaceId === null) return

        const restore = async () => {
            try {
                if (!await getReopenNotes()) return
                const saved = await getWorkspaceTabs(workspaceId)
                if (token !== restoreToken.current) return
                const existing = new Set(notesRef.current.map(note => note.id))
                // A saved right pane whose notes are all gone is dropped (an empty one that was saved empty is kept)
                const right = saved.right ? filterPane(saved.right, existing) : null
                dispatch({
                    type: "hydrate",
                    state: normalizeLayout({
                        left: filterPane(saved.left, existing),
                        right: right && (right.openIds.length > 0 || saved.right?.openIds.length === 0) ? right : null,
                        focused: saved.focused,
                    }),
                })
            } catch (error) {
                reportError(error)
            } finally {
                if (token === restoreToken.current) {
                    restoredRef.current = true
                    setRestoredTick(tick => tick + 1)
                    setRestoredFor(workspaceId)
                }
            }
        }
        restore()
    }, [workspaceId])

    // Persist the layout of the workspace (only once the saved one has been read, or it would be overwritten)
    useEffect(() => {
        if (workspaceId === null || !restoredRef.current) return
        saveWorkspaceTabs(workspaceId, state)
            .catch(error => reportError(error))
    }, [state, workspaceId, restoredTick])

    // The UI state of closed tabs is dropped (a note open in either pane keeps its state)
    useEffect(() => {
        uiStore.retain(openIds)
    }, [uiStore, openIds])

    const actions = useMemo<TabsActionsType>(() => ({
        openNote: id => dispatch({ type: "open", id }),
        closeNote: id => dispatch({ type: "close", id }),
        closeNotes: ids => dispatch({ type: "closeMany", ids }),
        closeActiveNote: () => dispatch({ type: "closeActive" }),
        closeAllNotes: () => dispatch({ type: "closeAll" }),
        reorderTabs: (from, to) => dispatch({ type: "pane", pane: stateRef.current.focused, action: { type: "reorder", from, to } }),
        activateNote: id => dispatch({ type: "activate", id }),
        cycleNote: direction => dispatch({ type: "cycle", direction }),
    }), [])

    const layoutActions = useMemo<LayoutActionsType>(() => ({
        split: () => dispatch({ type: "split" }),
        unsplit: () => dispatch({ type: "unsplit" }),
        toggleSplit: () => dispatch({ type: stateRef.current.right ? "unsplit" : "split" }),
        focusPane: pane => dispatch({ type: "focus", pane }),
        openInPane: (noteId, pane) => dispatch({ type: "pane", pane, action: { type: "open", id: noteId } }),
        moveToPane: (noteId, pane, index) => dispatch({ type: "moveToPane", id: noteId, pane, index }),
        getLayout: () => {
            const { left, right, focused } = stateRef.current
            return { left, right, focused, isSplit: right !== null }
        },
    }), [])

    const paneActions = useMemo(() => ([0, 1] as const).map((pane): TabsActionsType => ({
        openNote: id => dispatch({ type: "pane", pane, action: { type: "open", id } }),
        closeNote: id => dispatch({ type: "close", id }),
        closeNotes: ids => dispatch({ type: "closeMany", ids }),
        closeActiveNote: () => dispatch({ type: "pane", pane, action: { type: "closeActive" } }),
        closeAllNotes: () => {
            const current = stateRef.current
            const ids = (pane === 0 ? current.left : current.right)?.openIds
            if (ids?.length) dispatch({ type: "closeMany", ids })
        },
        reorderTabs: (from, to) => dispatch({ type: "pane", pane, action: { type: "reorder", from, to } }),
        activateNote: id => dispatch({ type: "pane", pane, action: { type: "activate", id } }),
        cycleNote: direction => dispatch({ type: "pane", pane, action: { type: "cycle", direction } }),
    })), [])

    const restored = workspaceId !== null && restoredFor === workspaceId
    const byId = useMemo(() => new Map(notes.map(note => [note.id, note])), [notes])

    const leftValue = useMemo(() => paneTabsValue(left, byId, restored), [left, byId, restored])
    const rightValue = useMemo(() => paneTabsValue(right, byId, restored), [right, byId, restored])

    const value = useMemo<TabsContextType>(() => {
        if (!right) return { ...leftValue }
        const focusedValue = focused === 0 ? leftValue : rightValue
        return {
            openIds,
            activeId: focusedValue.activeId,
            tabs: [...leftValue.tabs, ...rightValue.tabs],
            currentNote: focusedValue.currentNote,
            restored,
        }
    }, [right, focused, leftValue, rightValue, openIds, restored])

    const layout = useMemo<LayoutContextType>(() => ({ left, right, focused, isSplit: right !== null }), [left, right, focused])

    const paneTabs = useMemo<readonly [PaneTabsValue, PaneTabsValue]>(() => [
        { tabs: leftValue, actions: paneActions[0], activeStore: paneStores[0] },
        { tabs: rightValue, actions: paneActions[1], activeStore: paneStores[1] },
    ], [leftValue, rightValue, paneActions, paneStores])

    return (
        <TabsActionsContext.Provider value={actions}>
            <LayoutActionsContext.Provider value={layoutActions}>
                <TabUiContext.Provider value={uiStore}>
                    <FocusedPaneStoreContext.Provider value={focusedStore}>
                        <IsSplitStoreContext.Provider value={isSplitStore}>
                            <LayoutContext.Provider value={layout}>
                                <PaneTabsContext.Provider value={paneTabs}>
                                    <ActiveIdContext.Provider value={active}>
                                        <ActiveIdStoreContext.Provider value={activeStore}>
                                            <TabsContext.Provider value={value}>
                                                {children}
                                            </TabsContext.Provider>
                                        </ActiveIdStoreContext.Provider>
                                    </ActiveIdContext.Provider>
                                </PaneTabsContext.Provider>
                            </LayoutContext.Provider>
                        </IsSplitStoreContext.Provider>
                    </FocusedPaneStoreContext.Provider>
                </TabUiContext.Provider>
            </LayoutActionsContext.Provider>
        </TabsActionsContext.Provider>
    )
}
