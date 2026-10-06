import type { MouseEvent } from "react"
import type { FlatRow } from "./flat-tree"
import { flattenTree } from "./flat-tree"
import { treeRowKey } from "./tree-row"
import type { TreeData, TreeItemType, TreeRef } from "./tree-dnd"

/** Selection key of an item: ids collide across types, so the type is part of it ("note-12", "folder-3"). */
export const selectionKey = treeRowKey

/** The item a selection key stands for (null when the key is malformed). */
export function parseSelectionKey(key: string): TreeRef | null {
    const match = /^(folder|note)-(\d+)$/.exec(key)
    return match ? { type: match[1] as TreeItemType, id: Number(match[2]) } : null
}

/**
 * The multi-selection of the sidebar tree (framework independent, observable): a set of item keys and the anchor
 * of the range selection. `selected` is replaced (never mutated) on every change, so it works as a snapshot.
 */
export function createSelectionStore() {
    let selected: ReadonlySet<string> = new Set()
    let anchor: string | null = null
    // Keys of the rows in view, in order
    let visible: string[] = []
    const listeners = new Set<() => void>()

    const emit = () => listeners.forEach(listener => listener())
    const replace = (next: ReadonlySet<string>) => {
        selected = next
        emit()
    }

    return {
        getSelected: () => selected,
        getAnchor: () => anchor,
        has: (key: string) => selected.has(key),
        /** The selected items as refs, in the order of the rows in view. */
        getRefs: (): TreeRef[] => {
            const refs: TreeRef[] = []
            for (const key of visible) {
                const ref = selected.has(key) ? parseSelectionKey(key) : null
                if (ref) refs.push(ref)
            }
            return refs
        },
        /** Ctrl+click: adds or removes one item; it becomes the anchor of the next range. */
        toggle: (key: string) => {
            const next = new Set(selected)
            if (!next.delete(key)) next.add(key)
            anchor = key
            replace(next)
        },
        /**
         * Shift+click: selects the rows in view between the anchor and `key` (both included), replacing the selection.
         * Without a usable anchor (none, or no longer in view) only `key` is selected.
         */
        selectRange: (key: string) => {
            const to = visible.indexOf(key)
            const from = anchor === null ? -1 : visible.indexOf(anchor)
            if (to < 0 || from < 0) {
                anchor = key
                replace(new Set([key]))
                return
            }
            replace(new Set(visible.slice(Math.min(from, to), Math.max(from, to) + 1)))
        },
        /** Empties the selection; `nextAnchor` is where the next Shift+click range starts. */
        reset: (nextAnchor: string | null = null) => {
            anchor = nextAnchor
            if (selected.size > 0) replace(new Set())
        },
        /**
         * Tells the store which rows are in view (in order) and drops what is no longer there
         * (deleted, trashed, moved into a collapsed folder or to another workspace).
         */
        sync: (keys: string[]) => {
            visible = keys
            const inView = new Set(keys)
            if (anchor !== null && !inView.has(anchor)) anchor = null
            let next: Set<string> | null = null
            for (const key of selected) {
                if (inView.has(key)) continue
                next ??= new Set(selected)
                next.delete(key)
            }
            if (next) replace(next)
        },
        subscribe: (listener: () => void) => {
            listeners.add(listener)
            return () => { listeners.delete(listener) }
        },
    }
}

export type SelectionStore = ReturnType<typeof createSelectionStore>

/**
 * The selected items to act on: a selected folder stands for everything inside it, so a selected item that has
 * a selected folder among its ancestors is dropped (it would be processed twice). Same order as the tree
 * (subfolders first, then notes, depth first), duplicates removed.
 */
export function getTopMostItems(tree: TreeData, refs: TreeRef[]): TreeRef[] {
    const wanted = new Set(refs.map(ref => selectionKey(ref.type, ref.id)))
    const result: TreeRef[] = []
    // Rows of the whole tree, with every folder expanded; a selected folder hides what is under it
    const rows = flattenTree(tree, new Set())
    let hiddenDepth: number | null = null
    for (const row of rows) {
        if (hiddenDepth !== null && row.depth > hiddenDepth) continue
        hiddenDepth = null
        if (!wanted.has(row.key)) continue
        result.push({ type: row.kind, id: row.item.id })
        if (row.kind === "folder") hiddenDepth = row.depth
    }
    return result
}

/** Keys of the rows in view, for {@link SelectionStore.sync}. */
export const rowKeys = (rows: FlatRow[]) => rows.map(row => row.key)

/**
 * Applies the selection gestures of a click on a row: Ctrl/Cmd+click toggles the item, Shift+click selects the range.
 * @returns true when the click was a selection gesture (the row must then neither open nor toggle).
 */
export function handleSelectionClick(
    store: SelectionStore | null,
    key: string,
    event: Pick<MouseEvent, "ctrlKey" | "metaKey" | "shiftKey">,
): boolean {
    if (!store) return false
    if (event.shiftKey) {
        store.selectRange(key)
        return true
    }
    if (event.ctrlKey || event.metaKey) {
        store.toggle(key)
        return true
    }
    // A plain click clears the selection and starts the next range
    store.reset(key)
    return false
}
