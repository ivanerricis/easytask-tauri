import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import type { Folder, Group, Note, TrashItem, WorkspaceDataTree } from "@/types/types"
import { getDBWorkspaceData } from "@/db/queries/workspace";
import { createDBNoteInFolder, createDBWorkspaceNote } from "@/db/queries/note"
import { createDBSubFolder, createDBWorkspaceFolder, updateDBFolderColorContent } from "@/db/queries/folder";
import { createDBSection, createDBSectionInGroup } from "@/db/queries/section";
import { createDBSubTask, createDBTask, updateDBTaskCompletion, updateDBTaskDescription, updateDBTaskPriority } from "@/db/queries/task";
import { createDBGroup, updateDBGroupPositions } from "@/db/queries/group";
import { moveDBTreeItem } from "@/db/queries/tree";
import { moveDBSection, moveDBSectionToNewGroup, moveDBTask, type TaskMoveTarget } from "@/db/queries/move";
import { countDBTemplates, createDBNoteFromTemplate, createDBTemplateFromNote, getDBTemplates, updateDBTemplateFromNote } from "@/db/queries/template";
import type { NoteTemplate } from "@/types/template"
import { emptyDBTrash, getDBTrash, purgeDBItem, restoreDBItem } from "@/db/queries/trash";
import { renameDBItem, updateDBColor, deleteDBItem, type DBItemType } from "@/db/queries/shared_queries";
import { buildWorkspaceTree } from "./tree-builders"
import { TabsProvider } from "./tabs-context"
import { ActiveNoteProvider } from "./active-note-context"

/* ------------------------------------------------------------------------------------ */

type WorkspaceStateType = {
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
type WorkspaceActionsType = {
    setCurrentFolder: (folder: Folder | null) => void

    getWorkspaceData: (workspaceID: number) => Promise<void>

    createWorkspaceFolder: (workspaceID: number, name: string, color?: string) => Promise<void>
    createWorkspaceNote: (workspaceID: number, name: string, color?: string) => Promise<void>

    createSubFolder: (workspaceID: number, folderID: number, name: string) => Promise<void>
    createNoteInFolder: (workspaceID: number, folderID: number, name: string) => Promise<void>
    createGroup: (noteID: number, name: string) => Promise<void>
    createSection: (noteID: number, title: string, position: number) => Promise<void>
    createSectionInGroup: (groupId: number, title: string) => Promise<void>
    createTask: (sectionID: number, text: string) => Promise<void>
    createSubTask: (taskID: number, text: string) => Promise<void>

    updateTaskPriority: (taskID: number, priority: boolean) => Promise<void>
    updateTaskCompletion: (taskID: number, isCompleted: boolean) => Promise<void>
    updateTaskDescription: (taskID: number, description?: string) => Promise<void>
    renameItem: (itemType: DBItemType, itemId: number, name: string) => Promise<void>
    updateItemColor: (itemType: DBItemType, itemId: number, color?: string) => Promise<void>
    updateGroupsPositions: (groups: Group[]) => Promise<void>
    updateFolderColorContent: (folderID: number, color?: string) => Promise<void>

    moveTreeItem: (itemType: "folder" | "note", itemId: number, targetFolderId: number | null, targetIndex: number) => Promise<void>

    moveSection: (sectionID: number, targetGroupID: number, targetIndex: number) => Promise<void>
    moveSectionToNewGroup: (sectionID: number, groupPosition: number) => Promise<void>
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
    createNoteFromTemplate: (templateID: number, workspaceID: number, folderID: number | null, name: string) => Promise<number>
}

/* ------------------------------------------------------------------------------------ */

const WorkspaceStateContext = createContext<WorkspaceStateType | null>(null)
const WorkspaceActionsContext = createContext<WorkspaceActionsType | null>(null)
const WorkspaceLoadingContext = createContext<boolean>(false)

export function WorkspaceDataProvider({ children }: { children: React.ReactNode }) {

    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [folders, setFolders] = useState<Folder[]>([])
    const [notes, setNotes] = useState<Note[]>([])
    const [workspaceDataTree, setWorkspaceDataTree] = useState<WorkspaceDataTree | null>(null)
    const [loadedWorkspaceId, setLoadedWorkspaceId] = useState<number | null>(null)

    const [currentFolder, setCurrentFolder] = useState<Folder | null>(null)

    const [trashVersion, setTrashVersion] = useState(0)
    const [templatesVersion, setTemplatesVersion] = useState(0)

    // Latest data for the stable actions (deleteItem) without making them depend on it
    const latest = useRef({ folders, notes, currentFolder })
    useEffect(() => {
        latest.current = { folders, notes, currentFolder }
    }, [folders, notes, currentFolder])

    const pendingOps = useRef(0)

    /**
     * Runs an async operation and keeps isLoading true while any operation is in flight.
     * @param operation The operation to run.
     * @returns The result of the operation.
     * @category WorkspaceData Context
     */
    const withLoading = useCallback(async <T,>(operation: () => Promise<T>): Promise<T> => {
        pendingOps.current += 1
        setIsLoading(true)
        try {
            return await operation()
        } finally {
            pendingOps.current -= 1
            setIsLoading(pendingOps.current > 0)
        }
    }, [])

    /**
     * Runs an operation that can change the trash content and bumps trashVersion once it succeeds.
     * @param operation The operation to run.
     * @returns The result of the operation.
     * @category WorkspaceData Context
     */
    const withTrashChange = useCallback(<T,>(operation: () => Promise<T>): Promise<T> => withLoading(async () => {
        const result = await operation()
        setTrashVersion(version => version + 1)
        return result
    }), [withLoading])

    /* ------------------------------------------------------------------------------------ */
    // Getter methods

    /**
     * Retrieves the workspace data for a given workspace ID.
     * @param workspaceID The ID of the workspace to get data for.
     * @throws Will throw an error if the workspace data cannot be retrieved.
     * @category Workspace Data Context
     */
    const getWorkspaceData = useCallback((workspaceID: number) => withLoading(async () => {
        try {
            const data = await getDBWorkspaceData(workspaceID)
            setFolders(data?.folders || [])
            setNotes(data?.notes || [])
            const tree = buildWorkspaceTree(data?.folders || [], data?.notes || [])
            setWorkspaceDataTree(tree)
            setLoadedWorkspaceId(workspaceID)
        } catch (error) {
            setError('Errore caricamento dati del Workspace')
            throw error
        }
    }), [withLoading])

    /* ------------------------------------------------------------------------------------ */
    // Create methods

    const createWorkspaceFolder = useCallback((workspaceID: number, name: string, color?: string) =>
        withLoading(() => createDBWorkspaceFolder(workspaceID, name, color)), [withLoading])

    const createWorkspaceNote = useCallback((workspaceID: number, name: string, color?: string) =>
        withLoading(() => createDBWorkspaceNote(workspaceID, name, color)), [withLoading])

    const createSubFolder = useCallback((workspaceID: number, folderID: number, name: string) =>
        withLoading(() => createDBSubFolder(workspaceID, folderID, name)), [withLoading])

    const createNoteInFolder = useCallback((workspaceID: number, folderID: number, name: string) =>
        withLoading(() => createDBNoteInFolder(workspaceID, folderID, name)), [withLoading])

    const createGroup = useCallback((noteID: number, name: string) =>
        withLoading(() => createDBGroup(noteID, name)), [withLoading])

    const createSection = useCallback((noteID: number, title: string, position: number) =>
        withLoading(() => createDBSection(noteID, title, position)), [withLoading])

    const createSectionInGroup = useCallback((groupID: number, title: string) =>
        withLoading(() => createDBSectionInGroup(groupID, title)), [withLoading])

    const createTask = useCallback((sectionID: number, text: string) =>
        withLoading(() => createDBTask(sectionID, text)), [withLoading])

    const createSubTask = useCallback((taskID: number, text: string) =>
        withLoading(() => createDBSubTask(taskID, text)), [withLoading])

    /* ------------------------------------------------------------------------------------ */
    // Editing methods

    /**
     * Edit the priority of a task.
     * @param taskID - The ID of the task to edit.
     * @param priority - The new priority state of the task.
     * @throws Will throw an error if the task cannot be edited.
     * @category Workspace Data Context
     */
    const updateTaskPriority = useCallback((taskID: number, priority: boolean) =>
        withLoading(() => updateDBTaskPriority(taskID, priority)), [withLoading])

    /**
     * Update the completion status of a task.
     * @param taskID - The ID of the task to edit.
     * @param isCompleted - The new completion status of the task.
     * @throws Will throw an error if the task cannot be edited.
     * @category Workspace Data Context
     */
    const updateTaskCompletion = useCallback((taskID: number, isCompleted: boolean) =>
        withLoading(() => updateDBTaskCompletion(taskID, isCompleted)), [withLoading])

    const updateTaskDescription = useCallback((taskID: number, description?: string) =>
        withLoading(() => updateDBTaskDescription(taskID, description)), [withLoading])

    /**
     * Rename an item in the workspace.
     * @param itemType - The type of the item to rename (e.g., "folder", "note", "section", "task").
     * @param itemID - The ID of the item to rename.
     * @param name - The new name for the item.
     * @throws Will throw an error if the item cannot be renamed.
     * @category Workspace Data Context
     */
    const renameItem = useCallback((itemType: DBItemType, itemID: number, name: string) =>
        withLoading(() => renameDBItem(itemType, itemID, name)), [withLoading])

    /**
     * Update the color of an item in the workspace.
     * @param itemType - The type of the item to update (e.g., "folder", "note", "section", "task").
     * @param itemID - The ID of the item to update.
     * @param color - The new color for the item (optional).
     * @throws Will throw an error if the item color cannot be updated.
     * @category Workspace Data Context
     */
    const updateItemColor = useCallback((itemType: DBItemType, itemID: number, color?: string) =>
        withLoading(() => updateDBColor(itemType, itemID, color)), [withLoading])

    /**
     * Update the positions of multiple groups in the workspace.
     * @param newGroups - The array of groups to update positions for.
     * @throws Will throw an error if the group positions cannot be updated.
     * @category Workspace Data Context
     */
    const updateGroupsPositions = useCallback((newGroups: Group[]) =>
        withLoading(() => updateDBGroupPositions(newGroups)), [withLoading])

    /**
     * Update the color of a folder in the workspace.
     * @param folderID - The ID of the folder to update.
     * @param color - The new color for the folder (optional).
     * @throws Will throw an error if the folder color cannot be updated.
     * @category Workspace Data Context
     */
    const updateFolderColorContent = useCallback((folderID: number, color?: string) =>
        withLoading(() => updateDBFolderColorContent(folderID, color)), [withLoading])

    /* ------------------------------------------------------------------------------------ */
    // Deleting methods

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

    /**
     * Moves a section to a group of the open note at the given index among its sections. The section keeps all
     * its tasks. A source group left empty is removed. It does NOT reload the data: the caller must call refreshActiveNote.
     * @param sectionID - The ID of the section to move.
     * @param targetGroupID - The destination group ID (same note).
     * @param targetIndex - The index among the destination sections (clamped).
     * @throws Will throw an error if the move is invalid or the destination already has a section with the same title.
     * @category Workspace Data Context
     */
    const moveSection = useCallback((sectionID: number, targetGroupID: number, targetIndex: number) =>
        withTrashChange(() => moveDBSection(sectionID, targetGroupID, targetIndex)), [withTrashChange])

    /**
     * Moves a section into a new group created at the given index among the groups of the open note.
     * It does NOT reload the data: the caller must call refreshActiveNote.
     * @param sectionID - The ID of the section to move.
     * @param groupPosition - The index of the new group among the current groups (clamped).
     * @category Workspace Data Context
     */
    const moveSectionToNewGroup = useCallback((sectionID: number, groupPosition: number) =>
        withTrashChange(() => moveDBSectionToNewGroup(sectionID, groupPosition)), [withTrashChange])

    /**
     * Moves a task (with its whole subtree) to a section of the open note, at the top level or under another task,
     * at the given index among its new siblings. It does NOT reload the data: the caller must call refreshActiveNote.
     * @param taskID - The ID of the task to move.
     * @param target - The destination section and optional parent task.
     * @param targetIndex - The index among the destination siblings (clamped).
     * @throws Will throw an error if the target is invalid (e.g. the task itself or one of its descendants).
     * @category Workspace Data Context
     */
    const moveTask = useCallback((taskID: number, target: TaskMoveTarget, targetIndex: number) =>
        withTrashChange(() => moveDBTask(taskID, target, targetIndex)), [withTrashChange])

    /* ------------------------------------------------------------------------------------ */
    // Deleting methods

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
    }), [withTrashChange])

    /* ------------------------------------------------------------------------------------ */
    // Trash methods

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
        }), [withTrashChange])

    /**
     * Permanently deletes a trashed item. Does not reload the data.
     * @category Workspace Data Context
     */
    const purgeItem = useCallback((itemType: DBItemType, itemID: number) =>
        withTrashChange(async () => {
            await purgeDBItem(itemType, itemID)
            if (itemType === "note_template") setTemplatesVersion(version => version + 1)
        }), [withTrashChange])

    /**
     * Permanently deletes every trashed item of a workspace. Does not reload the data.
     * @category Workspace Data Context
     */
    const emptyTrash = useCallback((workspaceID: number) =>
        withTrashChange(async () => {
            await emptyDBTrash(workspaceID)
            setTemplatesVersion(version => version + 1)
        }), [withTrashChange])

    /* ------------------------------------------------------------------------------------ */
    // Template methods

    /**
     * Retrieves the templates of a workspace. Does not touch the context state.
     * @param workspaceID - The ID of the workspace.
     * @category Workspace Data Context
     */
    const getTemplates = useCallback((workspaceID: number) =>
        withLoading(() => getDBTemplates(workspaceID)), [withLoading])

    /**
     * Counts the templates of a workspace (for the footer badge).
     * @param workspaceID - The ID of the workspace.
     * @category Workspace Data Context
     */
    const countTemplates = useCallback((workspaceID: number) =>
        withLoading(() => countDBTemplates(workspaceID)), [withLoading])

    /**
     * Creates a template from a note (an exact snapshot of its current content).
     * @param noteID - The ID of the source note.
     * @param name - The template name (unique in the workspace).
     * @returns The ID of the new template.
     * @throws Will throw an error on a name clash or when the note no longer exists.
     * @category Workspace Data Context
     */
    const createTemplateFromNote = useCallback((noteID: number, name: string) => withLoading(async () => {
        const id = await createDBTemplateFromNote(noteID, name)
        setTemplatesVersion(version => version + 1)
        return id
    }), [withLoading])

    /**
     * Refreshes the snapshot of a template from its source note.
     * @param templateID - The ID of the template.
     * @throws Will throw an error when the source note no longer exists.
     * @category Workspace Data Context
     */
    const updateTemplateFromNote = useCallback((templateID: number) => withLoading(async () => {
        await updateDBTemplateFromNote(templateID)
        setTemplatesVersion(version => version + 1)
    }), [withLoading])

    /**
     * Creates a note from a template at the end of the destination. Does NOT reload the data:
     * the caller must call getWorkspaceData and can then open the note.
     * @param templateID - The ID of the template.
     * @param workspaceID - The ID of the workspace.
     * @param folderID - The destination folder, null for the workspace root.
     * @param name - The name of the new note.
     * @returns The ID of the new note.
     * @throws Will throw an error on a name clash in the destination.
     * @category Workspace Data Context
     */
    const createNoteFromTemplate = useCallback((templateID: number, workspaceID: number, folderID: number | null, name: string) =>
        withLoading(() => createDBNoteFromTemplate(templateID, workspaceID, folderID, name)), [withLoading])

    /**
     * Clears the workspace state (this also closes every tab, since the tabs follow the loaded workspace).
     * @category Workspace Data Context
     */
    const resetData = useCallback(() => {
        setCurrentFolder(null)
        setLoadedWorkspaceId(null)
    }, [])

    /* ------------------------------------------------------------------------------------ */

    const state = useMemo<WorkspaceStateType>(() => ({
        folders, notes, workspaceDataTree, currentFolder, error, trashVersion, templatesVersion
    }), [folders, notes, workspaceDataTree, currentFolder, error, trashVersion, templatesVersion])

    const actions = useMemo<WorkspaceActionsType>(() => ({
        setCurrentFolder,
        getWorkspaceData,
        createWorkspaceFolder,
        createWorkspaceNote,
        createSubFolder,
        createNoteInFolder,
        createGroup,
        createSection,
        createSectionInGroup,
        createTask,
        createSubTask,
        updateTaskPriority,
        updateTaskCompletion,
        updateTaskDescription,
        renameItem,
        updateItemColor,
        updateGroupsPositions,
        updateFolderColorContent,
        moveTreeItem,
        moveSection,
        moveSectionToNewGroup,
        moveTask,
        deleteItem,
        getTrash,
        restoreItem,
        purgeItem,
        emptyTrash,
        resetData,
        getTemplates,
        countTemplates,
        createTemplateFromNote,
        updateTemplateFromNote,
        createNoteFromTemplate
    }), [
        getWorkspaceData, createWorkspaceFolder, createWorkspaceNote,
        createSubFolder, createNoteInFolder, createGroup, createSection, createSectionInGroup,
        createTask, createSubTask, updateTaskPriority, updateTaskCompletion,
        updateTaskDescription, renameItem, updateItemColor, updateGroupsPositions,
        updateFolderColorContent, moveTreeItem, moveSection, moveSectionToNewGroup, moveTask, deleteItem, getTrash, restoreItem, purgeItem,
        emptyTrash, resetData, getTemplates, countTemplates, createTemplateFromNote, updateTemplateFromNote, createNoteFromTemplate
    ])

    return (
        <WorkspaceLoadingContext.Provider value={isLoading}>
            <WorkspaceStateContext.Provider value={state}>
                <WorkspaceActionsContext.Provider value={actions}>
                    <TabsProvider notes={notes} workspaceId={loadedWorkspaceId}>
                        <ActiveNoteProvider>
                            {children}
                        </ActiveNoteProvider>
                    </TabsProvider>
                </WorkspaceActionsContext.Provider>
            </WorkspaceStateContext.Provider>
        </WorkspaceLoadingContext.Provider>
    )
}

/* ------------------------------------------------------------------------------------ */

/**
 * The workspace data (folders, notes, trees, current folder, error, trashVersion, templatesVersion).
 * @category Workspace Data Context
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useWorkspaceState = () => {
    const context = useContext(WorkspaceStateContext)
    if (!context) throw new Error('useWorkspaceState must be used within a WorkspaceDataProvider')
    return context
}

/**
 * The stable workspace actions (their identity never changes).
 * @category Workspace Data Context
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useWorkspaceActions = () => {
    const context = useContext(WorkspaceActionsContext)
    if (!context) throw new Error('useWorkspaceActions must be used within a WorkspaceDataProvider')
    return context
}

/**
 * True while any workspace operation is in flight. Kept apart so the other consumers do not re-render when it toggles.
 * @category Workspace Data Context
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useWorkspaceLoading = () => useContext(WorkspaceLoadingContext)

/**
 * Workspace data and actions together. Tabs and active note data have their own hooks
 * (useTabs, useTabsActions, useActiveNote, useActiveNoteActions).
 * @category Workspace Data Context
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useWorkspaceData = () => ({ ...useWorkspaceState(), ...useWorkspaceActions() })
