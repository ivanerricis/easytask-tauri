import { useCallback, useContext, useSyncExternalStore } from "react"
import { collapsedIds } from "@/lib/collapsed"
import { useStoreSelector } from "@/lib/external-store"
import { createRequiredContextHook } from "@/lib/required-context"
import { reportError } from "@/lib/report-error"
import { getErrorMessage } from "@/lib/utils"
import { useActiveNoteActions } from "./use-active-note"
import { withRollback } from "./with-rollback"
import { useWorkspaceActions } from "./workspace-data/context"
import { ActiveIdContext, ActiveIdStoreContext, TabUiContext, TabsActionsContext, TabsContext, type RevealKind } from "./tabs-context-object"

/**
 * The open tabs, the active one and the derived Note objects. Re-renders when tabs or notes change.
 * @category Tabs
 */
export const useTabs = createRequiredContextHook(TabsContext, "useTabs", "TabsProvider")

/**
 * The stable tab actions (their identity never changes).
 * @category Tabs
 */
export const useTabsActions = createRequiredContextHook(TabsActionsContext, "useTabsActions", "TabsProvider")

/**
 * The id of the active note only: re-renders just when the active tab changes.
 * @category Tabs
 */
export const useActiveNoteId = () => useContext(ActiveIdContext)

/**
 * Reads a derived value of the active note id (e.g. "is it this note?"): re-renders only when that value changes,
 * not on every tab switch. The selector must return a primitive.
 * @category Tabs
 */
export const useActiveNoteSelector = <S,>(selector: (activeId: number | null) => S): S =>
    useStoreSelector(useContext(ActiveIdStoreContext), selector)

/**
 * The store of the per-note UI state.
 * @category Tabs
 */
export const useTabUiStore = createRequiredContextHook(TabUiContext, "useTabUiStore", "TabsProvider")

const COLLAPSED_SET = { group: "groups", section: "sections", task: "tasks" } as const

/**
 * Open/closed state of a group, a section or the subtasks of a task: the saved `collapsed` flag of the element in the
 * data of the active note (so it survives tab switches and restarts), or open because the search is showing a match
 * inside it (temporary, see the UI store). The row re-renders only when its own answer changes.
 * The toggle updates the note at once and saves in the background (a failure restores the previous state and reports it);
 * it is not an undo step.
 */
function useOpenState(kind: RevealKind, id: number): [boolean, () => void] {
    const store = useTabUiStore()
    const noteId = useActiveNoteId()
    const { getCachedNoteTree, subscribeNoteTree, patchGroup, patchSection, patchTask } = useActiveNoteActions()
    const { setCollapsed } = useWorkspaceActions()

    const subscribe = useCallback((listener: () => void) => {
        const stopTree = subscribeNoteTree(listener)
        const stopUi = store.subscribe(listener)
        return () => { stopTree(); stopUi() }
    }, [subscribeNoteTree, store])
    const isSavedClosed = useCallback(() => {
        const tree = noteId === null ? null : getCachedNoteTree(noteId)
        return tree !== null && collapsedIds(tree)[COLLAPSED_SET[kind]].has(id)
    }, [getCachedNoteTree, noteId, kind, id])
    const isOpen = useCallback(() =>
        !isSavedClosed() || (noteId !== null && store.isRevealed(noteId, kind, id)), [isSavedClosed, noteId, store, kind, id])
    const open = useSyncExternalStore(subscribe, isOpen)

    const toggle = useCallback(() => {
        if (noteId === null) return
        const closing = isOpen()
        // What the user sees wins over what the search opened: from now on only the saved state decides
        store.setRevealed(noteId, kind, id, false)
        // Already saved like that (the search had opened it): nothing to write
        if (isSavedClosed() === closing) return
        const patch = kind === "group" ? patchGroup : kind === "section" ? patchSection : patchTask
        withRollback(patch(id, { collapsed: closing }), () => setCollapsed(kind, id, closing))
            .catch(error => reportError(error, getErrorMessage(error)))
    }, [noteId, isOpen, isSavedClosed, store, kind, id, patchGroup, patchSection, patchTask, setCollapsed])
    return [open, toggle]
}

/**
 * Open/closed state of a section: saved in the database, so it survives tab switches and restarts.
 * @param sectionId The ID of the section.
 * @returns The open flag and a toggle function.
 * @category Tabs
 */
export const useSectionOpen = (sectionId: number): [boolean, () => void] => useOpenState("section", sectionId)

/**
 * Open/closed state of a group: saved in the database, so it survives tab switches and restarts.
 * @param groupId The ID of the group.
 * @returns The open flag and a toggle function.
 * @category Tabs
 */
export const useGroupOpen = (groupId: number): [boolean, () => void] => useOpenState("group", groupId)

/**
 * Whether the subtasks of a task are shown (open) or hidden (closed): saved in the database like the state of groups and
 * sections. A task without subtasks is simply "open".
 * @param taskId The ID of the task.
 * @returns The open flag and a toggle function.
 * @category Tabs
 */
export const useSubtasksOpen = (taskId: number): [boolean, () => void] => useOpenState("task", taskId)

type TabUiStore = ReturnType<typeof useTabUiStore>

/** The id of the task selected in a note (null when nothing, or something that is not a task, is selected). */
const readSelectedTaskId = (store: TabUiStore, noteId: number | null): number | null => {
    const item = noteId === null ? null : store.getSelectedItem(noteId)
    return item?.type === "task" ? item.id : null
}

/** A stable function that selects a task of a note (null clears the selection; nothing happens without a note). */
const useSelectTaskOf = (noteId: number | null) => {
    const store = useTabUiStore()
    return useCallback((taskId: number | null) => {
        if (noteId !== null) store.setSelectedItem(noteId, taskId === null ? null : { type: "task", id: taskId })
    }, [store, noteId])
}

/**
 * The id of the task selected in a note (the selection is kept per note), and a setter.
 * @param noteId The ID of the note (null without a note: nothing is selected).
 * @category Tabs
 */
export function useSelectedTask(noteId: number | null): [number | null, (taskId: number | null) => void] {
    const store = useTabUiStore()
    const selectedId = useSyncExternalStore(store.subscribe, () => readSelectedTaskId(store, noteId))
    return [selectedId, useSelectTaskOf(noteId)]
}

/**
 * Whether a task is the selected one of the active note: re-renders only when that answer changes.
 * @param taskId The ID of the task.
 * @category Tabs
 */
export function useIsTaskSelected(taskId: number): boolean {
    const store = useTabUiStore()
    const noteId = useActiveNoteId()
    return useSyncExternalStore(store.subscribe, () => readSelectedTaskId(store, noteId) === taskId)
}

/**
 * A stable function that selects a task of the active note (null clears the selection).
 * @category Tabs
 */
export function useSelectTask(): (taskId: number | null) => void {
    return useSelectTaskOf(useActiveNoteId())
}
