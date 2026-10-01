import { useCallback, useMemo } from "react"
import { emptyDBTrash, getDBTrash, purgeDBItem, restoreDBItem } from "@/db/queries/trash"
import { deleteDBItem, type DBItemType } from "@/db/queries/shared_queries"
import { findTreeItem, insertTreeItem, removeTreeItem } from "../workspace-tree-ops"
import type { Runtime, WorkspaceActionsType } from "./types"

type TrashActions = Pick<WorkspaceActionsType, "deleteItem" | "getTrash" | "restoreItem" | "purgeItem" | "emptyTrash">

/**
 * Delete (move to trash), restore, purge and empty. Every write that changes the trash bumps trashVersion.
 * @category WorkspaceData Context
 */
export function useTrashActions({ tabsBridge, withLoading, withTrashChange, latest, setCurrentFolder, setTemplatesVersion, applyTree, getTree }: Runtime): TrashActions {
    /**
     * Delete an item from the workspace (moves it to the trash). A folder or a note is removed from the sidebar tree
     * at once and put back if the write fails; the tabs of deleted notes (or of notes inside a deleted folder) are
     * closed by the tabs module as the tree changes (and reopened if the write fails). Deleting a folder clears the current folder if it was affected.
     * Sections, groups and tasks are removed from the open note by the caller.
     * @param itemType - The type of the item to delete (e.g., "folder", "note", "section", "task").
     * @param itemID - The ID of the item to delete.
     * @throws Will throw an error if the item cannot be deleted.
     * @category Workspace Data Context
     */
    const deleteItem = useCallback((itemType: DBItemType, itemID: number) => withTrashChange(async () => {
        // The folders under the deleted one, taken before the optimistic removal drops them from the state
        const folderIds = new Set<number>([itemID])
        if (itemType === "folder") {
            const { folders } = latest.current
            let added = true
            while (added) {
                added = false
                for (const folder of folders) {
                    if (folder.folderID != null && folderIds.has(folder.folderID) && !folderIds.has(folder.id)) {
                        folderIds.add(folder.id)
                        added = true
                    }
                }
            }
        }

        // Folders and notes leave the sidebar tree at once (and their open tabs close with them); restored on failure
        const tabsBefore = tabsBridge.current?.snapshot()
        const tree = getTree()
        const found = tree && (itemType === "folder" || itemType === "note") ? findTreeItem(tree, itemType, itemID) : undefined
        const rollback = found && (itemType === "folder" || itemType === "note")
            ? applyTree(
                t => removeTreeItem(t, itemType, itemID),
                t => insertTreeItem(t, itemType, found.item, found.parentId, found.index))
            : null
        try {
            await deleteDBItem(itemType, itemID)
        } catch (error) {
            rollback?.()
            // The tree is back: so are the tabs that the optimistic removal closed
            if (rollback && tabsBefore) tabsBridge.current?.reopen(tabsBefore)
            throw error
        }
        if (itemType === "note_template") setTemplatesVersion(version => version + 1)

        if (itemType === "folder") {
            const { currentFolder } = latest.current
            if (currentFolder && folderIds.has(currentFolder.id)) setCurrentFolder(null)
        }
    }), [tabsBridge, withTrashChange, applyTree, getTree, latest, setCurrentFolder, setTemplatesVersion])

    /**
     * Retrieves the trashed items of a workspace. Does not touch the context state.
     * @param workspaceID - The ID of the workspace.
     * @category Workspace Data Context
     */
    const getTrash = useCallback((workspaceID: number) =>
        withLoading(() => getDBTrash(workspaceID)), [withLoading])

    /**
     * Restores an item and its deleted ancestors. Does not reload the data: the caller must call
     * getWorkspaceData (and getNoteData if the current note may be affected).
     * @category Workspace Data Context
     */
    const restoreItem = useCallback((itemType: DBItemType, itemID: number) =>
        withTrashChange(async () => {
            await restoreDBItem(itemType, itemID)
            if (itemType === "note_template") setTemplatesVersion(version => version + 1)
        }), [withTrashChange, setTemplatesVersion])

    /**
     * Permanently deletes a trashed item. Does not reload the data.
     * @category Workspace Data Context
     */
    const purgeItem = useCallback((itemType: DBItemType, itemID: number) =>
        withTrashChange(async () => {
            await purgeDBItem(itemType, itemID)
            if (itemType === "note_template") setTemplatesVersion(version => version + 1)
        }), [withTrashChange, setTemplatesVersion])

    /**
     * Permanently deletes every trashed item of a workspace. Does not reload the data.
     * @category Workspace Data Context
     */
    const emptyTrash = useCallback((workspaceID: number) =>
        withTrashChange(async () => {
            await emptyDBTrash(workspaceID)
            setTemplatesVersion(version => version + 1)
        }), [withTrashChange, setTemplatesVersion])

    return useMemo(() => ({ deleteItem, getTrash, restoreItem, purgeItem, emptyTrash }), [ deleteItem, getTrash, restoreItem, purgeItem, emptyTrash ])
}
