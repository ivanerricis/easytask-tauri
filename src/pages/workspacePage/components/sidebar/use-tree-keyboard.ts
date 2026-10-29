import { useLayoutEffect, useRef, useState, type FocusEvent, type KeyboardEvent, type RefObject } from "react"
import { createTreeTabStopStore } from "./tree-row"
import { treeKeyAction } from "./tree-keyboard"
import { ROW_SELECTOR, whenRowMounted } from "./row-mounted"
import type { FlatRow } from "./flat-tree"
import type { VirtualTreeHandle } from "./VirtualTree"

type UseTreeKeyboardOptions = {
    rootElRef: RefObject<HTMLDivElement | null>
    virtualRef: RefObject<VirtualTreeHandle | null>
    virtualized: boolean
    flatRows: FlatRow[]
    collapsedIds: Set<number>
    /** A keyboard drag has its own keys. */
    dragging: boolean
    onToggleFolder: (folderId: number) => void
    onExpandFolder: (folderId: number) => void
}

/**
 * Keyboard navigation of the tree: the roving tabindex (the store of the row that is in the tab order), the focus of the rows and
 * the keys that move between them. The handlers go on the root of the tree (the focus and the keys of the rows bubble up to it).
 */
export const useTreeKeyboard = ({ rootElRef, virtualRef, virtualized, flatRows, collapsedIds, dragging, onToggleFolder, onExpandFolder }: UseTreeKeyboardOptions) => {
    // The row in the tab order (roving tabindex): the last one focused, or the first one
    const [tabStopStore] = useState(createTreeTabStopStore)
    const focusedKeyRef = useRef<string | null>(null)

    // A row that disappears (or gets hidden) takes the tab stop with it: it goes back to the first row
    useLayoutEffect(() => {
        const focused = focusedKeyRef.current
        tabStopStore.set(focused && flatRows.some(row => row.key === focused) ? focused : flatRows[0]?.key ?? null)
    }, [tabStopStore, flatRows])

    const handleTreeFocus = (event: FocusEvent<HTMLElement>) => {
        const key = (event.target as HTMLElement).closest?.(ROW_SELECTOR)?.getAttribute("data-row-key")
        if (!key) return
        focusedKeyRef.current = key
        tabStopStore.set(key)
    }

    /** Moves the focus to a row; a virtualized row that is not mounted yet is scrolled to and focused when it appears. */
    const focusRow = (key: string) => {
        focusedKeyRef.current = key
        tabStopStore.set(key)
        if (virtualized) virtualRef.current?.scrollToKey(key)
        whenRowMounted(rootElRef.current, key, row => row.focus(), { immediate: true })
    }

    // Arrows, Home and End move between the rows, Left / Right close / open the folders (Space and Enter are the row's own)
    const handleTreeKeyDown = (event: KeyboardEvent<HTMLElement>) => {
        // A keyboard drag has its own keys; the field of a rename and the buttons of a row are not rows
        if (dragging || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return
        const target = event.target as HTMLElement
        const current = target.matches?.(ROW_SELECTOR) ? target.dataset.rowKey : undefined
        if (!current) return
        const action = treeKeyAction(flatRows, current, event.key, collapsedIds)
        if (!action) return
        event.preventDefault()
        if (action.type === "focus") focusRow(action.key)
        else if (action.type === "expand") onExpandFolder(action.folderId)
        else onToggleFolder(action.folderId)
    }

    return { tabStopStore, handleTreeFocus, handleTreeKeyDown }
}
