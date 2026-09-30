import { useCallback, useMemo } from "react"
import { createDBNoteInFolder, createDBWorkspaceNote } from "@/db/queries/note"
import { createDBSubFolder, createDBWorkspaceFolder, updateDBFolderColorContent } from "@/db/queries/folder"
import { moveDBTreeItem } from "@/db/queries/tree"
import { renameDBItem, updateDBColor, type DBItemType } from "@/db/queries/shared_queries"
import {
    buildFolder, buildNote, colorFolderContent, findTreeItem, getFolderNotes, getSubfolders,
    insertTreeItem, patchTreeItem, removeTreeItem,
} from "../workspace-tree-ops"
import type { Runtime, WorkspaceActionsType } from "./types"

type TreeActions = Pick<WorkspaceActionsType,
    "createWorkspaceFolder" | "createWorkspaceNote" | "createSubFolder" | "createNoteInFolder" |
    "renameItem" | "updateItemColor" | "updateFolderColorContent" | "moveTreeItem">

/**
 * Folders and notes of the workspace tree: creations, rename/color (optimistic on the sidebar tree) and moves.
 * @category WorkspaceData Context
 */
export function useTreeActions(rt: Runtime): TreeActions {
    const { withLoading, applyTree, getTree, getWorkspaceData } = rt

    /**
     * Adds the created item to the sidebar tree. Without the new id, or when the parent is not in the tree,
     * the tree is reloaded in background instead.
     */
    const addToTree = useCallback((type: "folder" | "note", workspaceID: number, parentId: number | null, id: unknown, name: string, color?: string) => {
        const applied = typeof id === "number" && applyTree(
            tree => insertTreeItem(
                tree, type,
                type === "folder"
                    ? buildFolder(id, workspaceID, parentId, name, color, getSubfolders(tree, parentId))
                    : buildNote(id, workspaceID, parentId, name, color, getFolderNotes(tree, parentId)),
                parentId),
            tree => removeTreeItem(tree, type, id))
        if (!applied) getWorkspaceData(workspaceID).catch(console.error)
    }, [applyTree, getWorkspaceData])

    const createWorkspaceFolder = useCallback((workspaceID: number, name: string, color?: string) =>
        withLoading(async () => {
            addToTree("folder", workspaceID, null, await createDBWorkspaceFolder(workspaceID, name, color), name, color)
        }), [withLoading, addToTree])

    const createWorkspaceNote = useCallback((workspaceID: number, name: string, color?: string) =>
        withLoading(async () => {
            addToTree("note", workspaceID, null, await createDBWorkspaceNote(workspaceID, name, color), name, color)
        }), [withLoading, addToTree])

    const createSubFolder = useCallback((workspaceID: number, folderID: number, name: string) =>
        withLoading(async () => {
            addToTree("folder", workspaceID, folderID, await createDBSubFolder(workspaceID, folderID, name), name)
        }), [withLoading, addToTree])

    const createNoteInFolder = useCallback((workspaceID: number, folderID: number, name: string) =>
        withLoading(async () => {
            addToTree("note", workspaceID, folderID, await createDBNoteInFolder(workspaceID, folderID, name), name)
        }), [withLoading, addToTree])

    /**
     * Patches a folder/note of the sidebar tree before running the write and restores the previous value
     * when the write fails. Other item types are not part of the workspace tree: the write runs as is.
     */
    const patchThenWrite = useCallback(async (
        itemType: DBItemType, itemID: number, key: "name" | "color", value: string | undefined, write: () => Promise<void>,
    ) => {
        const tree = getTree()
        const found = tree && (itemType === "folder" || itemType === "note") ? findTreeItem(tree, itemType, itemID) : undefined
        const rollback = found && (itemType === "folder" || itemType === "note")
            ? applyTree(
                t => patchTreeItem(t, itemType, itemID, { [key]: value }),
                t => patchTreeItem(t, itemType, itemID, { [key]: found.item[key] }))
            : null
        try {
            await write()
        } catch (error) {
            rollback?.()
            throw error
        }
    }, [applyTree, getTree])

    /**
     * Rename an item in the workspace (folders and notes are updated in the sidebar tree at once).
     * @param itemType - The type of the item to rename (e.g., "folder", "note", "section", "task").
     * @param itemID - The ID of the item to rename.
     * @param name - The new name for the item.
     * @throws Will throw an error if the item cannot be renamed.
     * @category Workspace Data Context
     */
    const renameItem = useCallback((itemType: DBItemType, itemID: number, name: string) =>
        withLoading(() => patchThenWrite(itemType, itemID, "name", name, () => renameDBItem(itemType, itemID, name))),
        [withLoading, patchThenWrite])

    /**
     * Update the color of an item in the workspace (folders and notes are updated in the sidebar tree at once).
     * @param itemType - The type of the item to update (e.g., "folder", "note", "section", "task").
     * @param itemID - The ID of the item to update.
     * @param color - The new color for the item (optional).
     * @throws Will throw an error if the item color cannot be updated.
     * @category Workspace Data Context
     */
    const updateItemColor = useCallback((itemType: DBItemType, itemID: number, color?: string) =>
        withLoading(() => patchThenWrite(itemType, itemID, "color", color, () => updateDBColor(itemType, itemID, color))),
        [withLoading, patchThenWrite])

    /**
     * Update the color of a folder and of everything it contains (updated in the sidebar tree at once).
     * @param folderID - The ID of the folder to update.
     * @param color - The new color for the folder (optional).
     * @throws Will throw an error if the folder color cannot be updated.
     * @category Workspace Data Context
     */
    const updateFolderColorContent = useCallback((folderID: number, color?: string) => withLoading(async () => {
        const rollback = applyTree(tree => colorFolderContent(tree, folderID, color))
        try {
            await updateDBFolderColorContent(folderID, color)
        } catch (error) {
            rollback?.()
            throw error
        }
    }), [withLoading, applyTree])

    /**
     * Moves a folder or a note to another folder (null = workspace root) at the given index among its
     * new siblings of the same type. It does NOT reload the data: the caller must call getWorkspaceData.
     * @param itemType - "folder" or "note".
     * @param itemId - The ID of the item to move.
     * @param targetFolderId - The destination folder ID, or null for the workspace root.
     * @param targetIndex - The index among the destination siblings (clamped).
     * @throws Will throw an error if the move is invalid (e.g. folder into its own descendant) or a name conflict occurs.
     * @category Workspace Data Context
     */
    const moveTreeItem = useCallback((itemType: "folder" | "note", itemId: number, targetFolderId: number | null, targetIndex: number) =>
        withLoading(() => moveDBTreeItem(itemType, itemId, targetFolderId, targetIndex)), [withLoading])

    return useMemo(() => ({ createWorkspaceFolder, createWorkspaceNote, createSubFolder, createNoteInFolder, renameItem, updateItemColor, updateFolderColorContent, moveTreeItem }), [ createWorkspaceFolder, createWorkspaceNote, createSubFolder, createNoteInFolder, renameItem, updateItemColor, updateFolderColorContent, moveTreeItem ])
}
