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

/**
 * The id of the task selected in a note (the selection is kept per note), and a setter.
 * @param noteId The ID of the note (null without a note: nothing is selected).
 * @category Tabs
 */
export function useSelectedTask(noteId: number | null): [number | null, (taskId: number | null) => void] {
    const store = useTabUiStore()
    const selectedId = useSyncExternalStore(
        store.subscribe,
        () => {
            const item = noteId === null ? null : store.getSelectedItem(noteId)
            return item?.type === "task" ? item.id : null
        },
    )
    const select = useCallback((taskId: number | null) => {
        if (noteId !== null) store.setSelectedItem(noteId, taskId === null ? null : { type: "task", id: taskId })
    }, [store, noteId])
    return [selectedId, select]
}

/**
 * Whether a task is the selected one of the active note: re-renders only when that answer changes.
 * @param taskId The ID of the task.
 * @category Tabs
 */
export function useIsTaskSelected(taskId: number): boolean {
    const store = useTabUiStore()
    const noteId = useActiveNoteId()
    return useSyncExternalStore(
        store.subscribe,
        () => {
            const item = noteId === null ? null : store.getSelectedItem(noteId)
            return item?.type === "task" && item.id === taskId
        },
    )
}

/**
 * A stable function that selects a task of the active note (null clears the selection).
 * @category Tabs
 */
export function useSelectTask(): (taskId: number | null) => void {
    const store = useTabUiStore()
    const noteId = useActiveNoteId()
    return useCallback((taskId: number | null) => {
        if (noteId !== null) store.setSelectedItem(noteId, taskId === null ? null : { type: "task", id: taskId })
    }, [store, noteId])
}
