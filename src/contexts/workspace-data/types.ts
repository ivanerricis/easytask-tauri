import type { Dispatch, MutableRefObject, SetStateAction } from "react"
import type { Folder, Group, Note, TrashItem, WorkspaceDataTree } from "@/types/types"
import type { DBItemType } from "@/db/queries/shared_queries"
import type { TaskMoveTarget } from "@/db/queries/move"
import type { NoteTemplate } from "@/types/template"

export type WorkspaceStateType = {
    folders: Folder[]
    notes: Note[]
    workspaceDataTree: WorkspaceDataTree | null
    currentFolder: Folder | null
    error: string | null
    /** Incremented after every operation that can change the trash content (delete, restore, purge, empty, moves). */
    trashVersion: number
    /** Incremented after every operation that can change the templates of the workspace (create, update, delete, restore, purge). */
    templatesVersion: number
}

/** Every action has a stable identity (it never changes), so consumers of the actions alone never re-render because of it. */
export type WorkspaceActionsType = {
    setCurrentFolder: (folder: Folder | null) => void

    getWorkspaceData: (workspaceID: number) => Promise<void>
    /** Replaces the workspace tree (and the flat folders/notes derived from it) without reloading (optimistic updates). */
    setWorkspaceDataTree: (tree: WorkspaceDataTree) => void

    /** The creations of folders and notes resolve with the id of the new row (null when the database did not return it). */
    createWorkspaceFolder: (workspaceID: number, name: string, color?: string) => Promise<number | null>
    createWorkspaceNote: (workspaceID: number, name: string, color?: string) => Promise<number | null>

    createSubFolder: (workspaceID: number, folderID: number, name: string) => Promise<number | null>
    createNoteInFolder: (workspaceID: number, folderID: number, name: string) => Promise<number | null>
    /** The creations of the open note resolve with the ids of the new rows, so the caller can update the UI without reloading. */
    createGroup: (noteID: number, name: string) => Promise<number>
    createSection: (noteID: number, title: string, position: number) => Promise<{ groupId: number, sectionId: number }>
    createSectionInGroup: (groupId: number, title: string) => Promise<number>
    createTask: (sectionID: number, text: string) => Promise<number>
    createSubTask: (taskID: number, text: string) => Promise<number>

    updateTaskPriority: (taskID: number, priority: boolean) => Promise<void>
    updateTaskCompletion: (taskID: number, isCompleted: boolean) => Promise<void>
    updateTaskDescription: (taskID: number, description?: string) => Promise<void>
    renameItem: (itemType: DBItemType, itemId: number, name: string) => Promise<void>
    updateItemColor: (itemType: DBItemType, itemId: number, color?: string) => Promise<void>
    updateGroupsPositions: (groups: Group[]) => Promise<void>
    updateFolderColorContent: (folderID: number, color?: string) => Promise<void>

    moveTreeItem: (itemType: "folder" | "note", itemId: number, targetFolderId: number | null, targetIndex: number) => Promise<void>

    moveSection: (sectionID: number, targetGroupID: number, targetIndex: number) => Promise<void>
    /** Resolves with the id of the new group, so the caller can update the note without reloading. */
    moveSectionToNewGroup: (sectionID: number, groupPosition: number) => Promise<number>
    moveTask: (taskID: number, target: TaskMoveTarget, targetIndex: number) => Promise<void>

    deleteItem: (itemType: DBItemType, itemID: number) => Promise<void>
    getTrash: (workspaceID: number) => Promise<TrashItem[]>
    restoreItem: (itemType: DBItemType, itemID: number) => Promise<void>
    purgeItem: (itemType: DBItemType, itemID: number) => Promise<void>
    emptyTrash: (workspaceID: number) => Promise<void>
    resetData: () => void

    getTemplates: (workspaceID: number) => Promise<NoteTemplate[]>
    countTemplates: (workspaceID: number) => Promise<number>
    createTemplateFromNote: (noteID: number, name: string) => Promise<number>
    updateTemplateFromNote: (templateID: number) => Promise<void>
    createNoteFromTemplate: (templateID: number, workspaceID: number, folderID: number | null, name: string, color?: string | null) => Promise<number>
}

/**
 * What the domain modules share (built by the provider): the operation wrappers and the state they need.
 * @category WorkspaceData Context
 */
export type Runtime = {
    /** Runs an async operation and keeps isLoading true while any operation is in flight. */
    withLoading: <T>(operation: () => Promise<T>) => Promise<T>
    /** Runs an operation that can change the trash content and bumps trashVersion once it succeeds. */
    withTrashChange: <T>(operation: () => Promise<T>) => Promise<T>
    /** Latest data for the stable actions, without making them depend on it. */
    latest: MutableRefObject<{ folders: Folder[], currentFolder: Folder | null }>
    setCurrentFolder: Dispatch<SetStateAction<Folder | null>>
    setTemplatesVersion: Dispatch<SetStateAction<number>>
    getWorkspaceData: WorkspaceActionsType["getWorkspaceData"]
    /** The current workspace tree (null before the first load). */
    getTree: () => WorkspaceDataTree | null
    /**
     * Optimistically changes the workspace tree.
     * @param forward Returns the changed tree (the same one when there is nothing to do).
     * @param inverse Undoes the change on the latest tree; without it the previous tree is restored (or, when the
     * tree changed again meanwhile, reloaded in background).
     * @returns The rollback, or null when nothing was applied.
     */
    applyTree: (
        forward: (tree: WorkspaceDataTree) => WorkspaceDataTree,
        inverse?: (tree: WorkspaceDataTree) => WorkspaceDataTree,
    ) => (() => void) | null
}
