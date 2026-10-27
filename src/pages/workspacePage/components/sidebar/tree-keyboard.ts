import type { FlatRow } from "./flat-tree"

/** What a key does on a row of the tree. */
export type TreeKeyAction =
    | { type: "focus", key: string }
    | { type: "expand", folderId: number }
    | { type: "collapse", folderId: number }

/**
 * Keyboard navigation of the tree (WAI-ARIA tree pattern) over the visible rows, in order:
 * Up / Down move between the rows, Home / End go to the first / last row, Right opens a closed folder (on an open one it goes
 * to its first child), Left closes an open folder (on a note or a closed folder it goes to the parent folder).
 * Returns null for a key the tree does not handle; a handled key that cannot move (Down on the last row) focuses the same row.
 */
export function treeKeyAction(rows: FlatRow[], currentKey: string, key: string, collapsedIds: Set<number>): TreeKeyAction | null {
    const index = rows.findIndex(row => row.key === currentKey)
    if (index < 0) return null
    const current = rows[index]
    const focus = (target: FlatRow | undefined): TreeKeyAction => ({ type: "focus", key: (target ?? current).key })

    switch (key) {
        case "ArrowDown": return focus(rows[index + 1])
        case "ArrowUp": return focus(rows[index - 1])
        case "Home": return focus(rows[0])
        case "End": return focus(rows[rows.length - 1])
        case "ArrowRight": {
            if (current.kind !== "folder") return focus(current)
            if (collapsedIds.has(current.item.id)) return { type: "expand", folderId: current.item.id }
            const next = rows[index + 1]
            return focus(next && next.depth > current.depth ? next : current)
        }
        case "ArrowLeft": {
            if (current.kind === "folder" && !collapsedIds.has(current.item.id)) return { type: "collapse", folderId: current.item.id }
            for (let i = index - 1; i >= 0; i--) {
                if (rows[i].depth < current.depth) return focus(rows[i])
            }
            return focus(current)
        }
        default: return null
    }
}
