import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react"
import type { Folder, Group, Note, NoteDataTree, Section, Task, WorkspaceDataTree } from "@/types/types"
import { getDBWorkspaceData } from "@/db/queries/workspace";
import { createDBNoteInFolder, createDBWorkspaceNote, getDBNoteData } from "@/db/queries/note"
import { createDBSubFolder, createDBWorkspaceFolder, updateDBFolderColorContent } from "@/db/queries/folder";
import { createDBSection, createDBSectionInGroup } from "@/db/queries/section";
import { createDBSubTask, createDBTask, updateDBTaskCompletion, updateDBTaskDescription, updateDBTaskPriority } from "@/db/queries/task";
import { updateDBGroupPositions } from "@/db/queries/group";
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
    createNoteInFolder: (folderID: number, name: string) => Promise<void>
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

    deleteItem: (itemType: DBItemType, itemID: number) => Promise<void>
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
 * @param groups The list of groups to include in the note tree.
 * @param sections The list of sections to include in the note tree.
 * @param tasks The list of tasks to include in the note tree.
 * @returns The structured note data tree.
 * @category WorkspaceData Context
 */
function buildNoteTree(groups: Group[], sections: Section[], tasks: Task[]): NoteDataTree {
    const noteDataTree: NoteDataTree = { groups: [] }

    noteDataTree.groups = groups.map(group => {
        const sectionsOfGroup = sections
            .filter(section => section.groupID === group.id)
            .map(section => ({
                ...section,
                tasks: buildTasks(section.id),
            }))

        return {
            ...group,
            sections: sectionsOfGroup,
        }
    })

    function buildTasks(sectionId: number): Task[] {
        return tasks
            .filter(task => task.sectionID === sectionId && task.taskID === null)
            .map(task => ({
                ...task,
                subtasks: buildSubtasks(task.id),
            }))
    }

    function buildSubtasks(taskId: number): Task[] {
        return tasks
            .filter(subtask => subtask.taskID === taskId)
            .map(subtask => ({
                ...subtask,
                subtasks: buildSubtasks(subtask.id),
            }))
    }

    return noteDataTree
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

    const createNoteInFolder = useCallback((folderID: number, name: string) =>
        withLoading(() => createDBNoteInFolder(folderID, name)), [withLoading])

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
     * Delete an item from the workspace.
     * @param itemType - The type of the item to delete (e.g., "folder", "note", "section", "task").
     * @param itemID - The ID of the item to delete.
     * @throws Will throw an error if the item cannot be deleted.
     * @category Workspace Data Context
     */
    const deleteItem = useCallback((itemType: DBItemType, itemID: number) =>
        withLoading(() => deleteDBItem(itemType, itemID)), [withLoading])

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
        deleteItem,
        resetData
    }), [
        folders, notes, groups, sections, tasks, workspaceDataTree, noteDataTree,
        currentFolder, currentNote, currentNotes, error, isLoading,
        getWorkspaceData, getNoteData, createWorkspaceFolder, createWorkspaceNote,
        createSubFolder, createNoteInFolder, createSection, createSectionInGroup,
        createTask, createSubTask, updateTaskPriority, updateTaskCompletion,
        updateTaskDescription, renameItem, updateItemColor, updateGroupsPositions,
        updateFolderColorContent, deleteItem, resetData
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
