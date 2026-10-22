import type { Folder } from "@/types/types"
import { findTreeItem, insertTreeItem, removeTreeItem } from "../workspace-tree-ops"
import type { Runtime } from "./types"

/** The ids of a folder and of every folder under it. */
const collectFolderIds = (folder: Folder): number[] => [folder.id, ...folder.subfolders.flatMap(collectFolderIds)]

/**
 * Optimistically removes a folder or a note from the sidebar tree (their open tabs close with it) before a delete or archive write.
 * Other item types are left alone: the caller removes them from the open note.
 * @returns `undoRemoval` puts the tree and the closed tabs back (null when nothing was removed), to hand to withRollback;
 * `clearCurrentFolder` unselects the current folder when it was the removed one or lives under it (call it once the write succeeded).
 */
export function removeOptimistically(
    { tabsBridge, applyTree, getTree, setCurrentFolder }: Pick<Runtime, "tabsBridge" | "applyTree" | "getTree" | "setCurrentFolder">,
    itemType: string,
    itemID: number,
) {
    const tabsBefore = tabsBridge.current?.snapshot()
    const tree = getTree()
    const type = itemType === "folder" || itemType === "note" ? itemType : null
    const found = tree && type ? findTreeItem(tree, type, itemID) : undefined
    const rollback = found && type
        ? applyTree(
            t => removeTreeItem(t, type, itemID),
            t => insertTreeItem(t, type, found.item, found.parentId, found.index))
        : null
    // The folders under the removed one, taken from the item found before the optimistic removal drops them
    const folderIds = new Set(itemType === "folder" && found ? collectFolderIds(found.item as Folder) : [itemID])
    const undoRemoval = rollback && (() => {
        rollback()
        // The tree is back: so are the tabs that the optimistic removal closed
        if (tabsBefore) tabsBridge.current?.reopen(tabsBefore)
    })
    const clearCurrentFolder = () => {
        if (itemType === "folder") setCurrentFolder(current => current && folderIds.has(current.id) ? null : current)
    }
    return { undoRemoval, clearCurrentFolder }
}