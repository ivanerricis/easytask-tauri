/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react"
import { useWorkspace } from "@/contexts/use-workspace"
import { createSelectionStore, selectionKey, type SelectionStore } from "./selection"
import type { TreeItemType } from "./tree-dnd"

export const SelectionContext = createContext<SelectionStore | null>(null)

/** True when the focus is somewhere Esc has its own meaning (a field, a dialog, a menu). */
const escapeIsTaken = (target: EventTarget | null) =>
    target instanceof HTMLElement &&
    !!target.closest("input, textarea, select, [contenteditable='true'], [role='dialog'], [role='alertdialog'], [role='menu']")

/**
 * Holds the multi-selection of the sidebar tree. The selection belongs to one workspace (it is cleared when the
 * workspace changes) and Esc clears it, unless another handler already used the key or the focus is in a field/dialog.
 */
export function SelectionProvider({ children }: { children: ReactNode }) {
    const { currentWorkspace } = useWorkspace()
    const [store] = useState(createSelectionStore)
    const workspaceId = currentWorkspace?.id ?? null

    useEffect(() => { store.reset() }, [store, workspaceId])

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Escape" || event.defaultPrevented || store.getSelected().size === 0) return
            if (escapeIsTaken(event.target)) return
            store.reset()
        }
        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [store])

    return <SelectionContext.Provider value={store}>{children}</SelectionContext.Provider>
}

/** The selection store (null outside a SelectionProvider: rows then behave as without selection). */
export const useSelectionStore = () => useContext(SelectionContext)

const NEVER = () => () => {}

/** Whether an item is selected; only the rows whose state changes re-render. */
export function useIsSelected(type: TreeItemType, id: number): boolean {
    const store = useSelectionStore()
    const key = selectionKey(type, id)
    return useSyncExternalStore(store?.subscribe ?? NEVER, () => store?.has(key) ?? false)
}

/** Whether an item is selected together with at least another one: its menu then acts on the whole selection. */
export function useIsInMultiSelection(type: TreeItemType, id: number): boolean {
    const store = useSelectionStore()
    const key = selectionKey(type, id)
    return useSyncExternalStore(store?.subscribe ?? NEVER, () => !!store && store.has(key) && store.getSelected().size >= 2)
}

/** The selected keys (a new set on every change). */
export function useSelectedKeys(): ReadonlySet<string> {
    const store = useSelectionStore()
    return useSyncExternalStore(store?.subscribe ?? NEVER, () => store?.getSelected() ?? EMPTY)
}

const EMPTY: ReadonlySet<string> = new Set()
