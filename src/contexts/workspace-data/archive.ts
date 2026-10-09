import { useCallback, useMemo } from "react"
import { archiveDBItem, getDBArchive, getDBArchiveCount, unarchiveDBItem } from "@/db/queries/archive"
import type { ArchiveItemType, Folder } from "@/types/types"
import { withRollback } from "../with-rollback"
import { findTreeItem, insertTreeItem, removeTreeItem } from "../workspace-tree-ops"
import type { Runtime, WorkspaceActionsType } from "./types"

type ArchiveActions = Pick<WorkspaceActionsType, "archiveItem" | "unarchiveItem" | "getArchive" | "getArchiveCount">

/** The ids of a folder and of every folder under it. */
const collectFolderIds = (folder: Folder): number[] => [folder.id, ...folder.subfolders.flatMap(collectFolderIds)]

/**
 * Archive and unarchive. Every write that changes the archive bumps archiveVersion (the trash actions bump it too, because
 * an archived item can be moved to the trash and restored back to the archive).
 * @category WorkspaceData Context
 */
export function useArchiveActions({ tabsBridge, withLoading, withArchiveChange, bumpAudioVersion, setCurrentFolder, applyTree, getTree }: Runtime): ArchiveActions {
    /**
     * Archives an item: it disappears from the sidebar / the open note without going to the trash.
     * A folder or a note is removed from the sidebar tree at once and put back if the write fails; the tabs of archived
     * notes (or of notes inside an archived folder) are closed by the tabs module as the tree changes (and reopened if the
     * write fails). Archiving a folder clears the current folder if it was affected.
     * Groups, sections and tasks are removed from the open note by the caller, like for a deletion: wrap the call in
     * `withRollback(removeGroup(id) | removeSection(id) | removeTask(id), () => archiveItem(type, id))` (see note-optimistic).
     * @param itemType - "folder", "note", "section_group", "section" or "task" (a task takes its subtasks with it).
     * @param itemID - The ID of the item to archive.
     * @throws Will throw an error if the item cannot be archived.
     * @category Workspace Data Context
     */
    const archiveItem = useCallback((itemType: ArchiveItemType, itemID: number) => withArchiveChange(async () => {
        const tabsBefore = tabsBridge.current?.snapshot()
        const tree = getTree()
        const found = tree && (itemType === "folder" || itemType === "note") ? findTreeItem(tree, itemType, itemID) : undefined
        const rollback = found && (itemType === "folder" || itemType === "note")
            ? applyTree(
                t => removeTreeItem(t, itemType, itemID),
                t => insertTreeItem(t, itemType, found.item, found.parentId, found.index))
            : null
        const folderIds = new Set(itemType === "folder" && found ? collectFolderIds(found.item as Folder) : [itemID])
        const undoRemoval = rollback && (() => {
            rollback()
            // The tree is back: so are the tabs that the optimistic removal closed
            if (tabsBefore) tabsBridge.current?.reopen(tabsBefore)
        })
        await withRollback(undoRemoval, () => archiveDBItem(itemType, itemID))
        // Groups, notes and folders carry audio files
        if (itemType !== "section" && itemType !== "task") bumpAudioVersion()

        if (itemType === "folder") setCurrentFolder(current => current && folderIds.has(current.id) ? null : current)
    }), [tabsBridge, withArchiveChange, applyTree, getTree, bumpAudioVersion, setCurrentFolder])

    /**
     * Brings an item back from the archive together with its archived ancestors. Does not reload the data: the caller
     * must call getWorkspaceData (folders and notes) or reload the open note (groups and sections), like after restoreItem.
     * @throws A "<TYPE>_EXISTS" error when a visible item with the same name exists (nothing is unarchived).
     * @category Workspace Data Context
     */
    const unarchiveItem = useCallback((itemType: ArchiveItemType, itemID: number) => withArchiveChange(async () => {
        await unarchiveDBItem(itemType, itemID)
        // An archived ancestor group can come back too
        bumpAudioVersion()
    }), [withArchiveChange, bumpAudioVersion])

    /**
     * Retrieves the archived items of a workspace. Does not touch the context state.
     * @param workspaceID - The ID of the workspace.
     * @category Workspace Data Context
     */
    const getArchive = useCallback((workspaceID: number) =>
        withLoading(() => getDBArchive(workspaceID)), [withLoading])

    /**
     * The number of archived items of a workspace. Does not touch the context state (and does not raise isLoading, so a
     * badge can ask for it often).
     * @category Workspace Data Context
     */
    const getArchiveCount = useCallback((workspaceID: number) => getDBArchiveCount(workspaceID), [])

    return useMemo(() => ({ archiveItem, unarchiveItem, getArchive, getArchiveCount }), [archiveItem, unarchiveItem, getArchive, getArchiveCount])
}
