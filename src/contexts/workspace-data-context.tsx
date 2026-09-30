import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react"
import type { Folder, Group, Note, NoteDataTree, Section, Task, TrashItem, WorkspaceDataTree } from "@/types/types"
import { getDBWorkspaceData } from "@/db/queries/workspace";
import { createDBNoteInFolder, createDBWorkspaceNote, getDBNoteData } from "@/db/queries/note"
import { createDBSubFolder, createDBWorkspaceFolder, updateDBFolderColorContent } from "@/db/queries/folder";
import { createDBSection, createDBSectionInGroup } from "@/db/queries/section";
import { createDBSubTask, createDBTask, updateDBTaskCompletion, updateDBTaskDescription, updateDBTaskPriority } from "@/db/queries/task";
import { updateDBGroupPositions } from "@/db/queries/group";
import { moveDBTreeItem } from "@/db/queries/tree";
import { moveDBSection, moveDBSectionToNewGroup, moveDBTask, type TaskMoveTarget } from "@/db/queries/move";
import { emptyDBTrash, getDBTrash, purgeDBItem, restoreDBItem } from "@/db/queries/trash";
import { renameDBItem, updateDBColor, deleteDBItem, type DBItemType } from "@/db/queries/shared_queries";

/* ------------------------------------------------------------------------------------ */

type WorkspaceDataContextType = {
    folders: Folder[]
    notes: Note[]
    groups: Group[]
    sections: Section[]
    tasks: Task[]
    workspaceDataTree: WorkspaceDataTree | null
    noteDataTree: NoteDataTree | null
    currentFolder: Folder | null
    currentNote: Note | null
    currentNotes: Note[]
    error: string | null
    isLoading: boolean
    /** Incremented after every operation that can change the trash content (delete, restore, purge, empty, moves). */
    trashVersion: number

    setCurrentFolder: (folder: Folder | null) => void
    setCurrentNote: (note: Note | null) => void
    setCurrentNotes: React.Dispatch<React.SetStateAction<Note[]>>
    setGroups: React.Dispatch<React.SetStateAction<Group[]>>
    setSections: React.Dispatch<React.SetStateAction<Section[]>>
    setTasks: React.Dispatch<React.SetStateAction<Task[]>>
    setNoteDataTree: React.Dispatch<React.SetStateAction<NoteDataTree | null>>

    getWorkspaceData: (workspaceID: number) => Promise<void>
    getNoteData: (noteID: number) => Promise<void>

    createWorkspaceFolder: (workspaceID: number, name: string, color?: string) => Promise<void>
    createWorkspaceNote: (workspaceID: number, name: string, color?: string) => Promise<void>

    createSubFolder: (workspaceID: number, folderID: number, name: string) => Promise<void>
    createNoteInFolder: (workspaceID: number, folderID: number, name: string) => Promise<void>
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
}

/**
 * Builds a tree structure for the workspace, organizing folders and notes.
 * @param folders The list of folders to include in the tree.
 * @param notes The list of notes to include in the tree.
 * @returns The root folders and notes for the workspace.
 * @category WorkspaceData Context
 */
function buildWorkspaceTree(folders: Folder[], notes: Note[]) {
    const folderMap = new Map<number, Folder>()

    folders.forEach(folder => {
        folder.subfolders = []
        folder.notes = []
        folderMap.set(folder.id, folder)
    })

    folders.forEach(folder => {
        if (folder.folderID != null) {
            const parent = folderMap.get(folder.folderID)
            if (parent) {
                parent.subfolders.push(folder)
            }
        }
    })

    notes.forEach(note => {
        if (note.folderID != null) {
            const parent = folderMap.get(note.folderID)
            if (parent) {
                parent.notes.push(note)
            }
        }
    })

    const rootFolders = folders.filter(folder => folder.folderID == null)
    const rootNotes = notes.filter(note => note.folderID == null)

    return {
        rootFolders,
        rootNotes
    }
}

/**
 * Builds a tree structure for a note, organizing groups, sections, and tasks.
 * The input arrays are expected in position order (getDBNoteData sorts them), which the tree preserves.
 * @param groups The list of groups to include in the note tree.
 * @param sections The list of sections to include in the note tree.
 * @param tasks The list of tasks to include in the note tree.
 * @returns The structured note data tree.
 * @category WorkspaceData Context
 */
function buildNoteTree(groups: Group[], sections: Section[], tasks: Task[]): NoteDataTree {
    // Grouped once (O(n)), the insertion order keeps the position order of the input
    const sectionsByGroup = new Map<number, Section[]>()
    for (const section of sections) {
        const list = sectionsByGroup.get(section.groupID)
        if (list) list.push(section)
        else sectionsByGroup.set(section.groupID, [section])
    }

    const rootTasksBySection = new Map<number, Task[]>()
    const childrenByTask = new Map<number, Task[]>()
    for (const task of tasks) {
        if (task.taskID === null) {
            if (task.sectionID == null) continue
            const list = rootTasksBySection.get(task.sectionID)
            if (list) list.push(task)
            else rootTasksBySection.set(task.sectionID, [task])
        } else if (task.taskID != null) {
            const list = childrenByTask.get(task.taskID)
            if (list) list.push(task)
            else childrenByTask.set(task.taskID, [task])
        }
    }

    function buildTasks(list: Task[] | undefined): Task[] {
        return (list ?? []).map(task => ({
            ...task,
            subtasks: buildTasks(childrenByTask.get(task.id)),
        }))
    }

    return {
        groups: groups.map(group => ({
            ...group,
            sections: (sectionsByGroup.get(group.id) ?? []).map(section => ({
                ...section,
                tasks: buildTasks(rootTasksBySection.get(section.id)),
            })),
        })),
    }
}

/* ------------------------------------------------------------------------------------ */

const WorkspaceDataContext = createContext<WorkspaceDataContextType | null>(null)

export function WorkspaceDataProvider({ children }: { children: React.ReactNode }) {

    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [folders, setFolders] = useState<Folder[]>([])
    const [notes, setNotes] = useState<Note[]>([])
    const [groups, setGroups] = useState<Group[]>([])
    const [sections, setSections] = useState<Section[]>([])
    const [tasks, setTasks] = useState<Task[]>([])
    const [workspaceDataTree, setWorkspaceDataTree] = useState<WorkspaceDataTree | null>(null)
    const [noteDataTree, setNoteDataTree] = useState<NoteDataTree | null>(null)

    const [currentFolder, setCurrentFolder] = useState<Folder | null>(null)
    const [currentNote, setCurrentNote] = useState<Note | null>(null)
    const [currentNotes, setCurrentNotes] = useState<Note[]>([])

    const [trashVersion, setTrashVersion] = useState(0)

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
        } catch (error) {
            setError('Errore caricamento dati del Workspace')
            throw error
        }
    }), [withLoading])

    /**
     * Retrieves the note data for a given note ID.
     * @param noteID The ID of the note to get data for.
     * @throws Will throw an error if the note data cannot be retrieved.
     * @category Workspace Data Context
     */
    const getNoteData = useCallback((noteID: number) => withLoading(async () => {
        try {
            const dataFlat = await getDBNoteData(noteID)
            const tree = buildNoteTree(dataFlat?.groups ?? [], dataFlat?.sections ?? [], dataFlat?.tasks ?? [])
            setGroups(dataFlat?.groups ?? [])
            setSections(dataFlat?.sections ?? [])
            setTasks(dataFlat?.tasks ?? [])
            setNoteDataTree(tree)
        } catch (error) {
            setError('Errore caricamento dati nota')
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
    const updateGroupsPositions = useCallback((newGroups: Group[]) => withLoading(async () => {
        await updateDBGroupPositions(newGroups)
        setGroups(newGroups)
        setNoteDataTree(buildNoteTree(newGroups, sections, tasks))
    }), [withLoading, sections, tasks])

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
     * its tasks. A source group left empty is removed. It does NOT reload the data: the caller must call getNoteData.
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
     * It does NOT reload the data: the caller must call getNoteData.
     * @param sectionID - The ID of the section to move.
     * @param groupPosition - The index of the new group among the current groups (clamped).
     * @category Workspace Data Context
     */
    const moveSectionToNewGroup = useCallback((sectionID: number, groupPosition: number) =>
        withTrashChange(() => moveDBSectionToNewGroup(sectionID, groupPosition)), [withTrashChange])

    /**
     * Moves a task (with its whole subtree) to a section of the open note, at the top level or under another task,
     * at the given index among its new siblings. It does NOT reload the data: the caller must call getNoteData.
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
     * Closes the open tabs of the given notes, selecting the neighbour tab when the current one is closed
     * (same behaviour as the close button of NoteHeader).
     * @param noteIds The IDs of the notes whose tabs must be closed.
     * @category Workspace Data Context
     */
    const closeNoteTabs = useCallback((noteIds: Set<number>) => {
        if (!currentNotes.some(n => noteIds.has(n.id))) return
        const updated = currentNotes.filter(n => !noteIds.has(n.id))
        setCurrentNotes(updated)

        if (currentNote && noteIds.has(currentNote.id)) {
            const currentIndex = currentNotes.findIndex(n => n.id === currentNote.id)
            const neighbourIndex = currentNotes.slice(0, currentIndex).filter(n => !noteIds.has(n.id)).length
            setCurrentNote(updated[neighbourIndex] ?? updated[updated.length - 1] ?? null)
        }
    }, [currentNotes, currentNote])

    /**
     * Delete an item from the workspace (moves it to the trash).
     * Deleting a note closes its tab; deleting a folder closes the tabs of every note inside it
     * or inside its descendant folders and clears the current folder if it was affected.
     * @param itemType - The type of the item to delete (e.g., "folder", "note", "section", "task").
     * @param itemID - The ID of the item to delete.
     * @throws Will throw an error if the item cannot be deleted.
     * @category Workspace Data Context
     */
    const deleteItem = useCallback((itemType: DBItemType, itemID: number) => withTrashChange(async () => {
        await deleteDBItem(itemType, itemID)

        if (itemType === "note") {
            closeNoteTabs(new Set([itemID]))
        } else if (itemType === "folder") {
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
            closeNoteTabs(new Set(notes.filter(n => n.folderID != null && folderIds.has(n.folderID)).map(n => n.id)))
            if (currentFolder && folderIds.has(currentFolder.id)) setCurrentFolder(null)
        }
    }), [withTrashChange, closeNoteTabs, folders, notes, currentFolder])

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
        withTrashChange(() => restoreDBItem(itemType, itemID)), [withTrashChange])

    /**
     * Permanently deletes a trashed item. Does not reload the data.
     * @category Workspace Data Context
     */
    const purgeItem = useCallback((itemType: DBItemType, itemID: number) =>
        withTrashChange(() => purgeDBItem(itemType, itemID)), [withTrashChange])

    /**
     * Permanently deletes every trashed item of a workspace. Does not reload the data.
     * @category Workspace Data Context
     */
    const emptyTrash = useCallback((workspaceID: number) =>
        withTrashChange(() => emptyDBTrash(workspaceID)), [withTrashChange])

    const resetData = useCallback(() => {
        setCurrentFolder(null)
        setCurrentNote(null)
        setCurrentNotes([])
        setGroups([])
        setSections([])
        setTasks([])
        setNoteDataTree(null)
    }, [])

    /* ------------------------------------------------------------------------------------ */

    const value = useMemo(() => ({
        folders,
        notes,
        groups,
        sections,
        tasks,
        workspaceDataTree,
        noteDataTree,
        currentFolder,
        currentNote,
        currentNotes,
        error,
        isLoading,
        trashVersion,
        setCurrentFolder,
        setCurrentNote,
        setCurrentNotes,
        setGroups,
        setSections,
        setTasks,
        setNoteDataTree,
        getWorkspaceData,
        getNoteData,
        createWorkspaceFolder,
        createWorkspaceNote,
        createSubFolder,
        createNoteInFolder,
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
        resetData
    }), [
        folders, notes, groups, sections, tasks, workspaceDataTree, noteDataTree,
        currentFolder, currentNote, currentNotes, error, isLoading, trashVersion,
        getWorkspaceData, getNoteData, createWorkspaceFolder, createWorkspaceNote,
        createSubFolder, createNoteInFolder, createSection, createSectionInGroup,
        createTask, createSubTask, updateTaskPriority, updateTaskCompletion,
        updateTaskDescription, renameItem, updateItemColor, updateGroupsPositions,
        updateFolderColorContent, moveTreeItem, moveSection, moveSectionToNewGroup, moveTask, deleteItem, getTrash, restoreItem, purgeItem,
        emptyTrash, resetData
    ])

    return (
        <WorkspaceDataContext.Provider value={value}>
            {children}
        </WorkspaceDataContext.Provider>
    )
}

/* ------------------------------------------------------------------------------------ */

// eslint-disable-next-line react-refresh/only-export-components
export const useWorkspaceData = () => {
    const context = useContext(WorkspaceDataContext)
    if (!context) {
        throw new Error('useWorkspaceData must be used within a WorkspaceDataProvider')
    }
    return context
}
