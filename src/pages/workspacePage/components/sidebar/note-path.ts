import type { Folder } from "@/types/types"
import { findTreeItem, listTreeItems, type TreeData, type TreeItemType, type TreeRef } from "./tree-dnd"

export type NotePathSegment = { type: TreeItemType, id: number, name: string }

/** The folders above an item, nearest first (empty when the item is not in the tree). */
function ancestorFolders(tree: TreeData, ref: TreeRef): Folder[] {
    const item = findTreeItem(tree, ref)
    if (!item) return []
    const { folders } = listTreeItems(tree)
    const result: Folder[] = []
    const seen = new Set<number>()
    let parentId = item.folderID
    // `seen` guards against a corrupt parent cycle
    while (parentId != null && !seen.has(parentId)) {
        seen.add(parentId)
        const folder = folders.get(parentId)
        if (!folder) break
        result.push(folder)
        parentId = folder.folderID
    }
    return result
}

/** The folders above a note, from the root down, followed by the note itself (empty when the note is not in the tree). */
export function getNotePath(tree: TreeData, noteId: number): NotePathSegment[] {
    const note = findTreeItem(tree, { type: "note", id: noteId })
    if (!note) return []
    return [
        ...ancestorFolders(tree, { type: "note", id: noteId }).reverse().map(folder => ({ type: "folder" as const, id: folder.id, name: folder.name })),
        { type: "note", id: note.id, name: note.name },
    ]
}

/** Ids of the folders above an item (nearest first), which must be open for the item to be in view. */
export function getAncestorFolderIds(tree: TreeData, ref: TreeRef): number[] {
    return ancestorFolders(tree, ref).map(folder => folder.id)
}
