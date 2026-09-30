import { useCallback, useMemo } from "react"
import { emptyDBTrash, getDBTrash, purgeDBItem, restoreDBItem } from "@/db/queries/trash"
import { deleteDBItem, type DBItemType } from "@/db/queries/shared_queries"
import type { Runtime, WorkspaceActionsType } from "./types"

type TrashActions = Pick<WorkspaceActionsType, "deleteItem" | "getTrash" | "restoreItem" | "purgeItem" | "emptyTrash">

/**
 * Delete (move to trash), restore, purge and empty. Every write that changes the trash bumps trashVersion.
 * @category WorkspaceData Context
 */
export function useTrashActions({ withLoading, withTrashChange, latest, setCurrentFolder, setTemplatesVersion }: Runtime): TrashActions {
    /**
     * Delete an item from the workspace (moves it to the trash).
     * The tabs of deleted notes (or of notes inside a deleted folder) are closed by the tabs module as soon as the
     * caller reloads the workspace data (getWorkspaceData); deleting a folder clears the current folder if it was affected.
     * @param itemType - The type of the item to delete (e.g., "folder", "note", "section", "task").
     * @param itemID - The ID of the item to delete.
     * @throws Will throw an error if the item cannot be deleted.
     * @category Workspace Data Context
     */
    const deleteItem = useCallback((itemType: DBItemType, itemID: number) => withTrashChange(async () => {
        await deleteDBItem(itemType, itemID)
        if (itemType === "note_template") setTemplatesVersion(version => version + 1)

        if (itemType === "folder") {
            const { folders, currentFolder } = latest.current
            const folderIds = new Set<number>([itemID])
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
            if (currentFolder && folderIds.has(currentFolder.id)) setCurrentFolder(null)
        }
    }), [withTrashChange, latest, setCurrentFolder, setTemplatesVersion])

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
