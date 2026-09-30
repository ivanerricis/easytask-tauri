import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore } from "react"
import type { Note } from "@/types/types"
import { initialTabsState, tabsReducer } from "./tabs-reducer"
import { reportError } from "@/lib/report-error"
import { getReopenNotes } from "@/lib/store/preferences"
import { getWorkspaceTabs, saveWorkspaceTabs } from "@/lib/store/tabs"

/* ------------------------------------------------------------------------------------ */

type TabsContextType = {
    /** Ids of the open notes, in tab order. */
    openIds: number[]
    /** Id of the active tab, if any. */
    activeId: number | null
    /** The open notes, derived from the live notes list (ids not found are dropped). */
    tabs: Note[]
    /** The active note, derived from the live notes list. */
    currentNote: Note | null
}

type TabsActionsType = {
    /** Opens the note in a tab (if not already open) and makes it the active one. */
    openNote: (noteId: number) => void
    /** Closes a tab; when it is the active one the neighbour tab becomes active. */
    closeNote: (noteId: number) => void
    /** Closes several tabs at once. */
    closeNotes: (noteIds: readonly number[]) => void
    /** Closes the active tab. */
    closeActiveNote: () => void
    /** Closes every tab. */
    closeAllNotes: () => void
    /** Moves a tab from an index to another one and activates it. */
    reorderTabs: (from: number, to: number) => void
    /** Makes an open tab the active one. */
    activateNote: (noteId: number) => void
}

type ScrollPosition = { left: number, top: number }

/**
 * Per-note UI state that must survive tab switches (collapsed sections, scroll position).
 * It is a plain external store: it never triggers a re-render of the whole tabs tree.
 * @category Tabs
 */
export type TabUiStore = {
    isSectionCollapsed: (noteId: number, sectionId: number) => boolean
    setSectionCollapsed: (noteId: number, sectionId: number, collapsed: boolean) => void
    isGroupCollapsed: (noteId: number, groupId: number) => boolean
    setGroupCollapsed: (noteId: number, groupId: number, collapsed: boolean) => void
    getScroll: (noteId: number) => ScrollPosition | undefined
    setScroll: (noteId: number, position: ScrollPosition) => void
    /** Drops the UI state of the notes that are not in `keep` (closed tabs). */
    retain: (keep: readonly number[]) => void
    subscribe: (listener: () => void) => () => void
}

/**
 * Creates the store of the per-note UI state.
 * @returns The store.
 * @category Tabs
 */
function createTabUiStore(): TabUiStore {
    const collapsed = new Map<number, Set<number>>()
    const collapsedGroups = new Map<number, Set<number>>()
    const scroll = new Map<number, ScrollPosition>()
    const listeners = new Set<() => void>()
    const emit = () => listeners.forEach(listener => listener())

    return {
        isSectionCollapsed: (noteId, sectionId) => collapsed.get(noteId)?.has(sectionId) ?? false,
        setSectionCollapsed: (noteId, sectionId, value) => {
            const set = collapsed.get(noteId) ?? new Set<number>()
            if (set.has(sectionId) === value) return
            if (value) set.add(sectionId)
            else set.delete(sectionId)
            collapsed.set(noteId, set)
            emit()
        },
        isGroupCollapsed: (noteId, groupId) => collapsedGroups.get(noteId)?.has(groupId) ?? false,
        setGroupCollapsed: (noteId, groupId, value) => {
            const set = collapsedGroups.get(noteId) ?? new Set<number>()
            if (set.has(groupId) === value) return
            if (value) set.add(groupId)
            else set.delete(groupId)
            collapsedGroups.set(noteId, set)
            emit()
        },
        getScroll: noteId => scroll.get(noteId),
        setScroll: (noteId, position) => { scroll.set(noteId, position) },
        retain: keep => {
            const keepSet = new Set(keep)
            for (const id of [...collapsed.keys()]) if (!keepSet.has(id)) collapsed.delete(id)
            for (const id of [...collapsedGroups.keys()]) if (!keepSet.has(id)) collapsedGroups.delete(id)
            for (const id of [...scroll.keys()]) if (!keepSet.has(id)) scroll.delete(id)
        },
        subscribe: listener => {
            listeners.add(listener)
            return () => { listeners.delete(listener) }
        },
    }
}

const TabsContext = createContext<TabsContextType | null>(null)
const TabsActionsContext = createContext<TabsActionsType | null>(null)
const ActiveIdContext = createContext<number | null>(null)
const TabUiContext = createContext<TabUiStore | null>(null)

/* ------------------------------------------------------------------------------------ */

type TabsProviderProps = {
    /** The live notes of the loaded workspace: the tabs are derived from it. */
    notes: Note[]
    /** The ID of the loaded workspace (null when none), used to save and restore the open tabs. */
    workspaceId: number | null
    children: React.ReactNode
}

/**
 * Manages the open note tabs (ids only, reducer based), restores them per workspace at startup
 * and keeps the per-note UI state. Split in several contexts so consumers re-render only for what they use.
 * @category Tabs
 */
export function TabsProvider({ notes, workspaceId, children }: TabsProviderProps) {
    const [state, dispatch] = useReducer(tabsReducer, initialTabsState)
    const [uiStore] = useState(createTabUiStore)
    const [restoredTick, setRestoredTick] = useState(0)

    const notesRef = useRef(notes)
    const restoredRef = useRef(false)
    const restoreToken = useRef(0)
    const lastWorkspaceId = useRef<number | null>(null)
    const notesSeen = useRef(false)

    useEffect(() => {
        notesRef.current = notes
    }, [notes])

    // Tabs of notes that no longer exist (deleted, trashed, other workspace) are closed with the usual neighbour rule
    useEffect(() => {
        // Nothing to prune before the first notes list arrives
        if (!notesSeen.current) {
            notesSeen.current = true
            return
        }
        dispatch({ type: "prune", existing: new Set(notes.map(note => note.id)) })
    }, [notes])

    // Reset on workspace change, then restore the tabs saved for that workspace
    useEffect(() => {
        restoredRef.current = false
        const token = ++restoreToken.current
        if (lastWorkspaceId.current !== workspaceId) {
            lastWorkspaceId.current = workspaceId
            dispatch({ type: "restore", state: initialTabsState })
        }
        if (workspaceId === null) return

        const restore = async () => {
            try {
                if (!await getReopenNotes()) return
                const saved = await getWorkspaceTabs(workspaceId)
                if (token !== restoreToken.current) return
                const existing = new Set(notesRef.current.map(note => note.id))
                const openIds = saved.openIds.filter(id => existing.has(id))
                const activeId = saved.activeId !== null && openIds.includes(saved.activeId) ? saved.activeId : (openIds[0] ?? null)
                dispatch({ type: "hydrate", state: { openIds, activeId } })
            } catch (error) {
                reportError(error)
            } finally {
                if (token === restoreToken.current) {
                    restoredRef.current = true
                    setRestoredTick(tick => tick + 1)
                }
            }
        }
        restore()
    }, [workspaceId])

    // Persist the tabs of the workspace (only once the saved ones have been read, or they would be overwritten)
    useEffect(() => {
        if (workspaceId === null || !restoredRef.current) return
        saveWorkspaceTabs(workspaceId, { openIds: state.openIds, activeId: state.activeId })
            .catch(error => reportError(error))
    }, [state.openIds, state.activeId, workspaceId, restoredTick])

    // The UI state of closed tabs is dropped
    useEffect(() => {
        uiStore.retain(state.openIds)
    }, [uiStore, state.openIds])

    const actions = useMemo<TabsActionsType>(() => ({
        openNote: id => dispatch({ type: "open", id }),
        closeNote: id => dispatch({ type: "close", id }),
        closeNotes: ids => dispatch({ type: "closeMany", ids }),
        closeActiveNote: () => dispatch({ type: "closeActive" }),
        closeAllNotes: () => dispatch({ type: "closeAll" }),
        reorderTabs: (from, to) => dispatch({ type: "reorder", from, to }),
        activateNote: id => dispatch({ type: "activate", id }),
    }), [])

    const value = useMemo<TabsContextType>(() => {
        const byId = new Map(notes.map(note => [note.id, note]))
        const tabs = state.openIds.flatMap(id => byId.get(id) ?? [])
        return {
            openIds: state.openIds,
            activeId: state.activeId,
            tabs,
            currentNote: state.activeId !== null ? byId.get(state.activeId) ?? null : null,
        }
    }, [notes, state])

    return (
        <TabsActionsContext.Provider value={actions}>
            <TabUiContext.Provider value={uiStore}>
                <ActiveIdContext.Provider value={state.activeId}>
                    <TabsContext.Provider value={value}>
                        {children}
                    </TabsContext.Provider>
                </ActiveIdContext.Provider>
            </TabUiContext.Provider>
        </TabsActionsContext.Provider>
    )
}

/* ------------------------------------------------------------------------------------ */

/**
 * The open tabs, the active one and the derived Note objects. Re-renders when tabs or notes change.
 * @category Tabs
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useTabs = () => {
    const context = useContext(TabsContext)
    if (!context) throw new Error("useTabs must be used within a TabsProvider")
    return context
}

/**
 * The stable tab actions (their identity never changes).
 * @category Tabs
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useTabsActions = () => {
    const context = useContext(TabsActionsContext)
    if (!context) throw new Error("useTabsActions must be used within a TabsProvider")
    return context
}

/**
 * The id of the active note only: re-renders just when the active tab changes.
 * @category Tabs
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useActiveNoteId = () => useContext(ActiveIdContext)

/**
 * The store of the per-note UI state.
 * @category Tabs
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useTabUiStore = () => {
    const context = useContext(TabUiContext)
    if (!context) throw new Error("useTabUiStore must be used within a TabsProvider")
    return context
}

/**
 * Open/closed state of a section, kept per note so it survives tab switches.
 * @param sectionId The ID of the section.
 * @returns The open flag and a toggle function.
 * @category Tabs
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useSectionOpen(sectionId: number): [boolean, () => void] {
    const store = useTabUiStore()
    const noteId = useActiveNoteId()
    const collapsed = useSyncExternalStore(
        store.subscribe,
        () => noteId !== null && store.isSectionCollapsed(noteId, sectionId),
    )
    const toggle = useCallback(() => {
        if (noteId !== null) store.setSectionCollapsed(noteId, sectionId, !store.isSectionCollapsed(noteId, sectionId))
    }, [store, noteId, sectionId])
    return [!collapsed, toggle]
}

/**
 * Open/closed state of a group, kept per note so it survives tab switches.
 * @param groupId The ID of the group.
 * @returns The open flag and a toggle function.
 * @category Tabs
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useGroupOpen(groupId: number): [boolean, () => void] {
    const store = useTabUiStore()
    const noteId = useActiveNoteId()
    const collapsed = useSyncExternalStore(
        store.subscribe,
        () => noteId !== null && store.isGroupCollapsed(noteId, groupId),
    )
    const toggle = useCallback(() => {
        if (noteId !== null) store.setGroupCollapsed(noteId, groupId, !store.isGroupCollapsed(noteId, groupId))
    }, [store, noteId, groupId])
    return [!collapsed, toggle]
}
