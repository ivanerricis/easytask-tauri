import { createContext, useContext, useState } from "react"
import type { Folder, Group, Note } from "@/types/types"
import { getDBWorkspaceData } from "@/db/queries/workspace";
import { createDBNoteInFolder, createDBWorkspaceNote, getDBNoteData } from "@/db/queries/note"
import { createDBSubFolder, createDBWorkspaceFolder, updateDBFolderColorContent } from "@/db/queries/folder";
import { createDBSection, createDBSectionInGroup } from "@/db/queries/section";
import { changeDBTaskText, createDBSubTask, createDBTask, updateDBTaskCompletion, updateDBTaskPriority } from "@/db/queries/task";
import { updateDBGroupPositions } from "@/db/queries/group";
import { renameDBItem, updateDBColor, deleteDBItem } from "@/db/queries/shared_queries";

/* ------------------------------------------------------------------------------------ */

type WorkspaceDataContextType = {
    folders: Folder[]
    notes: Note[]
    groups: Group[]
    currentFolder: Folder | null
    currentNote: Note | null
    currentNotes: Note[]
    error: string | null
    isLoading: boolean

    setCurrentFolder: (folder: Folder | null) => void
    setCurrentNote: (note: Note | null) => void
    setCurrentNotes: React.Dispatch<React.SetStateAction<Note[]>>
    setGroups: React.Dispatch<React.SetStateAction<Group[]>>

    getWorkspaceData: (workspaceId: number) => Promise<void>
    getNoteData: (noteId: number) => Promise<void>

    createWorkspaceFolder: (workspaceId: number, name: string, color?: string) => Promise<void>
    createWorkspaceNote: (workspaceId: number, name: string, color?: string) => Promise<void>

    createSubFolder: (folderId: number, name: string) => Promise<void>
    createNoteInFolder: (folderId: number, name: string) => Promise<void>
    createSection: (noteId: number, title: string, position: number) => Promise<void>
    createSectionInGroup: (groupId: number, title: string) => Promise<void>
    createTask: (sectionId: number, text: string) => Promise<void>
    createSubTask: (taskId: number, text: string) => Promise<void>

    updateTaskPriority: (taskId: number, priority: boolean) => Promise<void>
    updateTaskCompletion: (taskId: number, isCompleted: boolean) => Promise<void>
    changeTaskText: (taskId: number, text: string) => Promise<void>
    renameItem: (itemType: string, itemId: number, name: string) => Promise<void>
    updateItemColor: (itemType: string, itemId: number, color?: string) => Promise<void>
    updateGroupsPositions: (groups: Group[]) => Promise<void>
    updateFolderColorContent: (folderId: number, color?: string) => Promise<void>

    deleteItem: (itemType: string, itemId: number) => Promise<void>
    resetData: () => void
}

/* ------------------------------------------------------------------------------------ */

const WorkspaceDataContext = createContext<WorkspaceDataContextType | null>(null)

export function WorkspaceDataProvider({ children }: { children: React.ReactNode }) {

    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [folders, setFolders] = useState<Folder[]>([])
    const [notes, setNotes] = useState<Note[]>([])
    const [groups, setGroups] = useState<Group[]>([])

    const [currentFolder, setCurrentFolder] = useState<Folder | null>(null)
    const [currentNote, setCurrentNote] = useState<Note | null>(null)
    const [currentNotes, setCurrentNotes] = useState<Note[]>([])

    /* ------------------------------------------------------------------------------------ */
    // Getter methods

    /**
     * Retrieves the workspace data for a given workspace ID.
     * @param workspaceId The ID of the workspace to get data for.
     * @throws Will throw an error if the workspace data cannot be retrieved.
     * @category Workspace Data Context
     */
    const getWorkspaceData = async (workspaceId: number) => {
        setIsLoading(true)
        try {
            const data = await getDBWorkspaceData(workspaceId)
            setFolders(data?.folders || [])
            setNotes(data?.notes || [])
        } catch (error) {
            setError('Errore caricamento dati del Workspace')
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    /**
     * Retrieves the note data for a given note ID.
     * @param noteId The ID of the note to get data for.
     * @throws Will throw an error if the note data cannot be retrieved.
     * @category Workspace Data Context
     */
    const getNoteData = async (noteId: number) => {
        if (isLoading) return
        setIsLoading(true)
        try {
            const data = await getDBNoteData(noteId)
            setGroups(data?.groups || [])
        } catch (error) {
            setError('Errore caricamento dati nota')
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    /* ------------------------------------------------------------------------------------ */
    // Create methods

    const createWorkspaceFolder = async (workspaceId: number, name: string, color?: string) => {
        if (isLoading) return
        setIsLoading(true)
        try {
            await createDBWorkspaceFolder(workspaceId, name, color)
        } catch (error) {
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    const createWorkspaceNote = async (workspaceId: number, name: string, color?: string) => {
        if (isLoading) return
        setIsLoading(true)
        try {
            await createDBWorkspaceNote(workspaceId, name, color)
        } catch (error) {
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    const createSubFolder = async (folderId: number, name: string) => {
        if (isLoading) return
        setIsLoading(true)
        try {
            await createDBSubFolder(folderId, name)
        } catch (error: any) {
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    const createNoteInFolder = async (folderId: number, name: string) => {
        if (isLoading) return
        setIsLoading(true)
        try {
            await createDBNoteInFolder(folderId, name)
        } catch (error) {
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    const createSection = async (noteId: number, title: string, position: number) => {
        if (isLoading) return
        setIsLoading(true)
        try {
            await createDBSection(noteId, title, position)
        } catch (error: any) {
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    const createSectionInGroup = async (groupId: number, title: string) => {
        if (isLoading) return
        setIsLoading(true)
        try {
            await createDBSectionInGroup(groupId, title)
        } catch (error: any) {
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    const createTask = async (sectionId: number, text: string) => {
        if (isLoading) return
        setIsLoading(true)
        try {
            await createDBTask(sectionId, text)
        } catch (error) {
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    const createSubTask = async (taskId: number, text: string) => {
        if (isLoading) return
        setIsLoading(true)
        try {
            await createDBSubTask(taskId, text)
        } catch (error) {
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    /* ------------------------------------------------------------------------------------ */
    // Editing methods

    /**
     * Edit the priority of a task.
     * @param taskId - The ID of the task to edit.
     * @param priority - The new priority state of the task.
     * @throws Will throw an error if the task cannot be edited.
     * @category Workspace Data Context
     */
    const updateTaskPriority = async (taskId: number, priority: boolean) => {
        if (isLoading) return
        setIsLoading(true)
        try {
            await updateDBTaskPriority(taskId, priority)
        } catch (error) {
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    /**
     * Update the completion status of a task.
     * @param taskId - The ID of the task to edit.
     * @param isCompleted - The new completion status of the task.
     * @throws Will throw an error if the task cannot be edited.
     * @category Workspace Data Context
     */
    const updateTaskCompletion = async (taskId: number, isCompleted: boolean) => {
        if (isLoading) return
        setIsLoading(true)
        try {
            await updateDBTaskCompletion(taskId, isCompleted)
        } catch (error) {
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    const changeTaskText = async (taskId: number, text: string) => {
        if (isLoading) return
        setIsLoading(true)
        try {
            await changeDBTaskText(taskId, text)
        } catch (error: any) {
            throw error
        }
    }

    /**
     * Rename an item in the workspace.
     * @param itemType - The type of the item to rename (e.g., "folder", "note", "section", "task").
     * @param itemId - The ID of the item to rename.
     * @param name - The new name for the item.
     * @throws Will throw an error if the item cannot be renamed.
     * @category Workspace Data Context
     */
    const renameItem = async (itemType: string, itemId: number, name: string) => {
        if (isLoading) return
        setIsLoading(true)
        try {
            await renameDBItem(itemType, itemId, name)
        } catch (error) {
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    /**
     * Update the color of an item in the workspace.
     * @param itemType - The type of the item to update (e.g., "folder", "note", "section", "task").
     * @param itemId - The ID of the item to update.
     * @param color - The new color for the item (optional).
     * @throws Will throw an error if the item color cannot be updated.
     * @category Workspace Data Context
     */
    const updateItemColor = async (itemType: string, itemId: number, color?: string) => {
        if (isLoading) return
        setIsLoading(true)
        try {
            await updateDBColor(itemType, itemId, color)
        } catch (error: any) {
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    /**
     * Update the positions of multiple groups in the workspace.
     * @param groups - The array of groups to update positions for.
     * @throws Will throw an error if the group positions cannot be updated.
     * @category Workspace Data Context
     */
    const updateGroupsPositions = async (groups: Group[]) => {
        if (isLoading) return
        setIsLoading(true)
        try {
            await updateDBGroupPositions(groups)
        } catch (error) {
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    /**
     * Update the color of a folder in the workspace.
     * @param folderId - The ID of the folder to update.
     * @param color - The new color for the folder (optional).
     * @throws Will throw an error if the folder color cannot be updated.
     * @category Workspace Data Context
     */
    const updateFolderColorContent = async (folderId: number, color?: string) => {
        if (isLoading) return
        setIsLoading(true)
        try {
            await updateDBFolderColorContent(folderId, color)
        } catch (error) {
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    /* ------------------------------------------------------------------------------------ */
    // Deleting methods

    /**
     * Delete an item from the workspace.
     * @param itemType - The type of the item to delete (e.g., "folder", "note", "section", "task").
     * @param itemId - The ID of the item to delete.
     * @throws Will throw an error if the item cannot be deleted.
     * @category Workspace Data Context
     */
    const deleteItem = async (itemType: string, itemId: number) => {
        if (isLoading) return
        setIsLoading(true)
        try {
            await deleteDBItem(itemType, itemId)
        } catch (error: any) {
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    const resetData = () => {
        setCurrentFolder(null)
        setCurrentNote(null)
        setCurrentNotes([])
        setGroups([])
    }

    /* ------------------------------------------------------------------------------------ */

    return (
        <WorkspaceDataContext.Provider value={{
            folders,
            notes,
            groups,
            currentFolder,
            currentNote,
            currentNotes,
            error,
            isLoading,
            setCurrentFolder,
            setCurrentNote,
            setCurrentNotes,
            setGroups,
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
            changeTaskText,
            renameItem,
            updateItemColor,
            updateGroupsPositions,
            updateFolderColorContent,
            deleteItem,
            resetData
        }}>
            {children}
        </WorkspaceDataContext.Provider>
    )
}

/* ------------------------------------------------------------------------------------ */

export const useWorkspaceData = () => {
    const context = useContext(WorkspaceDataContext)
    if (!context) {
        throw new Error('useWorkspaceData must be used within a WorkspaceDataProvider')
    }
    return context
}
