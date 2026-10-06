import { useCallback, useMemo } from "react"
import { emptyDBTrash, getDBTrash, getDBTrashCount, purgeDBItem, restoreDBItem } from "@/db/queries/trash"
import { deleteDBItem, type DBItemType } from "@/db/queries/shared_queries"
import type { Folder } from "@/types/types"
import { withRollback } from "../with-rollback"
import { findTreeItem, insertTreeItem, removeTreeItem } from "../workspace-tree-ops"
import type { Runtime, WorkspaceActionsType } from "./types"

type TrashActions = Pick<WorkspaceActionsType, "deleteItem" | "getTrash" | "getTrashCount" | "restoreItem" | "purgeItem" | "emptyTrash">

/** The items whose deletion, restore or purge can change the visible audio files. */
const AUDIO_TYPES: readonly DBItemType[] = ["folder", "note", "section_group", "audio_file"]

/** The ids of a folder and of every folder under it. */
const collectFolderIds = (folder: Folder): number[] => [folder.id, ...folder.subfolders.flatMap(collectFolderIds)]

/**
 * Delete (move to trash), restore, purge and empty. Every write that changes the trash bumps trashVersion.
 * @category WorkspaceData Context
 */
export function useTrashActions({ tabsBridge, withLoading, withTrashChange, bumpAudioVersion, setCurrentFolder, setTemplatesVersion, applyTree, getTree }: Runtime): TrashActions {
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
        // Folders and notes leave the sidebar tree at once (and their open tabs close with them); restored on failure
        const tabsBefore = tabsBridge.current?.snapshot()
        const tree = getTree()
        const found = tree && (itemType === "folder" || itemType === "note") ? findTreeItem(tree, itemType, itemID) : undefined
        const rollback = found && (itemType === "folder" || itemType === "note")
            ? applyTree(
                t => removeTreeItem(t, itemType, itemID),
                t => insertTreeItem(t, itemType, found.item, found.parentId, found.index))
            : null
        // The folders under the deleted one, taken from the item found before the optimistic removal drops them
        const folderIds = new Set(itemType === "folder" && found ? collectFolderIds(found.item as Folder) : [itemID])
        const undoRemoval = rollback && (() => {
            rollback()
            // The tree is back: so are the tabs that the optimistic removal closed
            if (tabsBefore) tabsBridge.current?.reopen(tabsBefore)
        })
        await withRollback(undoRemoval, () => deleteDBItem(itemType, itemID))
        if (itemType === "note_template") setTemplatesVersion(version => version + 1)
        if (AUDIO_TYPES.includes(itemType)) bumpAudioVersion()

        if (itemType === "folder") setCurrentFolder(current => current && folderIds.has(current.id) ? null : current)
    }), [tabsBridge, withTrashChange, applyTree, getTree, bumpAudioVersion, setCurrentFolder, setTemplatesVersion])

    /**
     * Retrieves the trashed items of a workspace. Does not touch the context state.
     * @param workspaceID - The ID of the workspace.
     * @category Workspace Data Context
     */
    const getTrash = useCallback((workspaceID: number) =>
        withLoading(() => getDBTrash(workspaceID)), [withLoading])

    /**
     * The number of items in the trash of a workspace. Does not touch the context state (and does not raise isLoading,
     * so a badge can ask for it often).
     * @category Workspace Data Context
     */
    const getTrashCount = useCallback((workspaceID: number) => getDBTrashCount(workspaceID), [])

    /**
     * Restores an item and its deleted ancestors. Does not reload the data: the caller must call
     * getWorkspaceData (and getNoteData if the current note may be affected).
     * @category Workspace Data Context
     */
    const restoreItem = useCallback((itemType: DBItemType, itemID: number) =>
        withTrashChange(async () => {
            await restoreDBItem(itemType, itemID)
            if (itemType === "note_template") setTemplatesVersion(version => version + 1)
            // Restoring a section or a task can bring back its deleted group too
            bumpAudioVersion()
        }), [withTrashChange, bumpAudioVersion, setTemplatesVersion])

    /**
     * Permanently deletes a trashed item. Does not reload the data.
     * @category Workspace Data Context
     */
    const purgeItem = useCallback((itemType: DBItemType, itemID: number) =>
        withTrashChange(async () => {
            await purgeDBItem(itemType, itemID)
            if (itemType === "note_template") setTemplatesVersion(version => version + 1)
            if (AUDIO_TYPES.includes(itemType)) bumpAudioVersion()
        }), [withTrashChange, bumpAudioVersion, setTemplatesVersion])

    /**
     * Permanently deletes every trashed item of a workspace. Does not reload the data.
     * @category Workspace Data Context
     */
    const emptyTrash = useCallback((workspaceID: number) =>
        withTrashChange(async () => {
            await emptyDBTrash(workspaceID)
            setTemplatesVersion(version => version + 1)
            bumpAudioVersion()
        }), [withTrashChange, bumpAudioVersion, setTemplatesVersion])

    return useMemo(() => ({ deleteItem, getTrash, getTrashCount, restoreItem, purgeItem, emptyTrash }), [ deleteItem, getTrash, getTrashCount, restoreItem, purgeItem, emptyTrash ])
}
