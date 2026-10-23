/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react"
import { useActiveNote } from "@/contexts/use-active-note"
import { useActiveNoteId, useTabUiStore } from "@/contexts/use-tabs"
import { usePreferences } from "@/contexts/use-preferences"
import { createSelectionStore, type SelectionStore } from "../sidebar/selection"
import { flattenVisibleTasks, taskKey } from "./task-selection"

export const TaskSelectionContext = createContext<SelectionStore | null>(null)

/** True when the focus is somewhere Esc has its own meaning (a field, a dialog, a menu). */
const escapeIsTaken = (target: EventTarget | null) =>
    target instanceof HTMLElement &&
    !!target.closest("input, textarea, select, [contenteditable='true'], [role='dialog'], [role='alertdialog'], [role='menu']")

/**
 * Tells the store which tasks are in view (in drawing order), so a range selection follows the screen and a task that is
 * deleted, archived, hidden (completed) or inside a closed group/section leaves the selection.
 */
function TaskSelectionSync({ store }: { store: SelectionStore }) {
    const { noteDataTree } = useActiveNote()
    const noteId = useActiveNoteId()
    const uiStore = useTabUiStore()
    const { hideCompletedTasks } = usePreferences()

    useEffect(() => {
        const sync = () => {
            if (!noteDataTree || noteId === null) return store.sync([])
            const tasks = flattenVisibleTasks(noteDataTree, {
                hideCompleted: hideCompletedTasks,
                isGroupOpen: groupId => !uiStore.isGroupCollapsed(noteId, groupId),
                isSectionOpen: sectionId => !uiStore.isSectionCollapsed(noteId, sectionId),
            })
            store.sync(tasks.map(task => taskKey(task.id)))
        }
        sync()
        return uiStore.subscribe(sync)
    }, [store, noteDataTree, noteId, uiStore, hideCompletedTasks])

    return null
}

/**
 * Holds the multi-selection of the tasks of the open note (Ctrl/Cmd+click toggles, Shift+click selects a range, Esc clears).
 * The selection belongs to the active note (it is cleared when another note becomes active) and Esc leaves it alone when
 * another handler already used the key or the focus is in a field/dialog/menu.
 */
export function TaskSelectionProvider({ children }: { children: ReactNode }) {
    const noteId = useActiveNoteId()
    const [store] = useState(createSelectionStore)

    useEffect(() => { store.reset() }, [store, noteId])

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Escape" || event.defaultPrevented || store.getSelected().size === 0) return
            if (escapeIsTaken(event.target)) return
            store.reset()
        }
        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [store])

    return (
        <TaskSelectionContext.Provider value={store}>
            <TaskSelectionSync store={store} />
            {children}
        </TaskSelectionContext.Provider>
    )
}

/** The task selection store (null outside a TaskSelectionProvider: rows then behave as without multi-selection). */
export const useTaskSelectionStore = () => useContext(TaskSelectionContext)

const NEVER = () => () => {}

/** Whether a task is part of the multi-selection; only the rows whose state changes re-render. */
export function useIsTaskMultiSelected(id: number): boolean {
    const store = useTaskSelectionStore()
    const key = taskKey(id)
    return useSyncExternalStore(store?.subscribe ?? NEVER, () => store?.has(key) ?? false)
}

/** Whether a task is selected together with at least another one: its menu then acts on the whole selection. */
export function useIsInTaskMultiSelection(id: number): boolean {
    const store = useTaskSelectionStore()
    const key = taskKey(id)
    return useSyncExternalStore(store?.subscribe ?? NEVER, () => !!store && store.has(key) && store.getSelected().size >= 2)
}

const EMPTY: ReadonlySet<string> = new Set()

/** The selected task keys (a new set on every change). */
export function useSelectedTaskKeys(): ReadonlySet<string> {
    const store = useTaskSelectionStore()
    return useSyncExternalStore(store?.subscribe ?? NEVER, () => store?.getSelected() ?? EMPTY)
}
