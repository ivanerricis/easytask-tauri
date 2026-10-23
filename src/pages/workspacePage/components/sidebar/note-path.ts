import { findTreeItem, listTreeItems, type TreeData, type TreeItemType, type TreeRef } from "./tree-dnd"

export type NotePathSegment = { type: TreeItemType, id: number, name: string }

/** The folders above a note, from the root down, followed by the note itself (empty when the note is not in the tree). */
export function getNotePath(tree: TreeData, noteId: number): NotePathSegment[] {
    const note = findTreeItem(tree, { type: "note", id: noteId })
    if (!note) return []
    const { folders } = listTreeItems(tree)
    const path: NotePathSegment[] = [{ type: "note", id: note.id, name: note.name }]
    const seen = new Set<number>()
    let parentId = note.folderID
    // `seen` guards against a corrupt parent cycle
    while (parentId != null && !seen.has(parentId)) {
        seen.add(parentId)
        const folder = folders.get(parentId)
        if (!folder) break
        path.unshift({ type: "folder", id: folder.id, name: folder.name })
        parentId = folder.folderID
    }
    return path
}

/** Ids of the folders above an item (nearest first), which must be open for the item to be in view. */
export function getAncestorFolderIds(tree: TreeData, ref: TreeRef): number[] {
    const item = findTreeItem(tree, ref)
    if (!item) return []
    const { folders } = listTreeItems(tree)
    const ids: number[] = []
    let parentId = item.folderID
    while (parentId != null && !ids.includes(parentId)) {
        ids.push(parentId)
        parentId = folders.get(parentId)?.folderID ?? null
    }
    return ids
}
