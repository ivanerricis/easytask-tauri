import type { Folder, Note } from "@/types/types"
import type { TreeData } from "./tree-dnd"
import { treeRowKey } from "./tree-row"

/** Visible rows above this count switch the sidebar to the virtualized renderer. */
export const VIRTUALIZE_THRESHOLD = 200

export type FlatRow =
    | { kind: "folder", key: string, item: Folder, depth: number }
    | { kind: "note", key: string, item: Note, depth: number }

/**
 * Flattens the tree into the visible rows, in the same order as the recursive render:
 * subfolders first, then notes. Children of collapsed folders are skipped.
 */
export function flattenTree(tree: TreeData, collapsedIds: Set<number>): FlatRow[] {
    const rows: FlatRow[] = []
    const noteRow = (item: Note, depth: number) =>
        rows.push({ kind: "note", key: treeRowKey("note", item.id), item, depth })
    const visit = (folders: Folder[], depth: number) => {
        for (const folder of folders) {
            rows.push({ kind: "folder", key: treeRowKey("folder", folder.id), item: folder, depth })
            if (collapsedIds.has(folder.id)) continue
            visit(folder.subfolders ?? [], depth + 1)
            for (const note of folder.notes ?? []) noteRow(note, depth + 1)
        }
    }
    visit(tree.rootFolders, 0)
    for (const note of tree.rootNotes) noteRow(note, 0)
    return rows
}
