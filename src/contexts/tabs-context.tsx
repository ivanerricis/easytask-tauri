import { useEffect, useMemo, useReducer, useRef, useState } from "react"
import type { Note } from "@/types/types"
import {
    ActiveIdContext, TabUiContext, TabsActionsContext, TabsContext,
    type ScrollPosition, type SelectedItem, type TabUiStore, type TabsActionsType, type TabsContextType,
} from "./tabs-context-object"
import { initialTabsState, tabsReducer } from "./tabs-reducer"
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
    const collapsed = new Map<number, Set<number>>()
    const collapsedGroups = new Map<number, Set<number>>()
    const scroll = new Map<number, ScrollPosition>()
    const selected = new Map<number, SelectedItem>()
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
            for (const id of [...collapsed.keys()]) if (!keepSet.has(id)) collapsed.delete(id)
            for (const id of [...collapsedGroups.keys()]) if (!keepSet.has(id)) collapsedGroups.delete(id)
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
