import { useCallback, useContext, useSyncExternalStore } from "react"
import { ActiveIdContext, TabUiContext, TabsActionsContext, TabsContext } from "./tabs-context-object"

/**
 * The open tabs, the active one and the derived Note objects. Re-renders when tabs or notes change.
 * @category Tabs
 */
export const useTabs = () => {
    const context = useContext(TabsContext)
    if (!context) throw new Error("useTabs must be used within a TabsProvider")
    return context
}

/**
 * The stable tab actions (their identity never changes).
 * @category Tabs
 */
export const useTabsActions = () => {
    const context = useContext(TabsActionsContext)
    if (!context) throw new Error("useTabsActions must be used within a TabsProvider")
    return context
}

/**
 * The id of the active note only: re-renders just when the active tab changes.
 * @category Tabs
 */
export const useActiveNoteId = () => useContext(ActiveIdContext)

/**
 * The store of the per-note UI state.
 * @category Tabs
 */
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
