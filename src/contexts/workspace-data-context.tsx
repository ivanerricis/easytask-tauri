import { createContext, useContext, useState } from "react"
import { core } from '@tauri-apps/api';
const { invoke } = core;
import type { Folder, Group, Note } from "@/types"
import { getDBWorkspaceData } from "@/db/queries/workspace";
import { createDBNoteInFolder, createDBWorkspaceNote, deleteDBNote, getDBNoteData } from "@/db/queries/note"
import { createDBSubFolder, createDBWorkspaceFolder, deleteDBFolder } from "@/db/queries/folder";
import { createDBSection, createDBSectionInGroup, deleteDBSection } from "@/db/queries/section";
import { createDBSubTask, createDBTask, deleteDBTask } from "@/db/queries/task";

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
    getGroups: (noteId: string) => Promise<void>

    createWorkspaceFolder: (workspaceId: number, name: string, color?: string) => Promise<void>
    createWorkspaceNote: (workspaceId: number, name: string, color?: string) => Promise<void>
    createSubFolder: (folderId: number, name: string, color?: string) => Promise<void>
    createNoteInFolder: (folderId: number, name: string, color?: string) => Promise<void>
    createSection: (noteId: number, title: string, position: number, color?: string) => Promise<void>
    createSectionInGroup: (groupId: number, title: string, color?: string) => Promise<void>
    createTask: (sectionId: number, text: string, color?: string) => Promise<void>
    createSubTask: (taskId: number, text: string, color?: string) => Promise<void>

    editNote: (noteId: number, name: string, color?: string) => Promise<void>
    editFolder: (folderId: number, name: string, color?: string) => Promise<void>

    deleteFolder: (id: number) => Promise<void>
    deleteNote: (id: number) => Promise<void>
    deleteSection: (id: number) => Promise<void>
    deleteTask: (id: number) => Promise<void>
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
    const getWorkspaceData = async (workspaceId: number) => {
        if (isLoading) return
        setIsLoading(true)
        try {
            const data = await getDBWorkspaceData(workspaceId)
            setFolders(data.folders)
            setNotes(data.notes)
        } catch (error) {
            setError('Errore caricamento dati del Workspace')
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    const getNoteData = async (noteId: number) => {
        if (isLoading) return
        setIsLoading(true)
        try {
            const data = await getDBNoteData(noteId)
            setGroups(data.groups || [])
        } catch (error) {
            setError('Errore caricamento dati nota')
            throw error
        } finally {
            setIsLoading(false)
        }
    }



    const getGroups = async (noteId: string) => {
        if (isLoading) return
        setIsLoading(true)
        try {
            const data: Group[] = await invoke('get_groups', { noteId })
            setGroups(data)
        } catch (error) {
            setError('Errore caricamento gruppi')
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

    const createSubFolder = async (folderId: number, name: string, color?: string) => {
        if (isLoading) return
        setIsLoading(true)
        try {
            await createDBSubFolder(folderId, name, color)
        } catch (error) {
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    const createNoteInFolder = async (folderId: number, name: string, color?: string) => {
        if (isLoading) return
        setIsLoading(true)
        try {
            await createDBNoteInFolder(folderId, name, color)
        } catch (error) {
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    const createSection = async (noteId: number, title: string, position: number, color?: string) => {
        if (isLoading) return
        setIsLoading(true)
        try {
            await createDBSection(noteId, title, position, color)
        } catch (error: any) {
            if (error?.message?.includes('SECTION_EXISTS')) {
                throw new Error('Esiste già una Section con questo nome')
            }
            else if (error?.message?.includes('EMPTY_NAME')) {
                throw new Error('Il titolo della Section non può essere vuoto')
            }
            else if (error?.message?.includes('GENERIC_ERROR')) {
                throw new Error('Errore durante la creazione della sezione')
            }
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    const createSectionInGroup = async (groupId: number, title: string, color?: string) => {
        if (isLoading) return
        setIsLoading(true)
        try {
            await createDBSectionInGroup(groupId, title, color)
        } catch (error: any) {
            if (error?.message?.includes('SECTION_EXISTS')) {
                throw new Error('Esiste già una Section con questo nome')
            }
            else if (error?.message?.includes('EMPTY_NAME')) {
                throw new Error('Il titolo della Section non può essere vuoto')
            }
            else if (error?.message?.includes('GENERIC_ERROR')) {
                throw new Error('Errore durante la creazione della sezione')
            }
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    const createTask = async (sectionId: number, text: string, color?: string) => {
        if (isLoading) return
        setIsLoading(true)
        try {
            await createDBTask(sectionId, text, color)
        } catch (error) {
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    const createSubTask = async (taskId: number, text: string, color?: string) => {
        if (isLoading) return
        setIsLoading(true)
        try {
            await createDBSubTask(taskId, text, color)
        } catch (error) {
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    /* ------------------------------------------------------------------------------------ */
    // Editing methods

    const editNote = async (noteId: number, name: string, color?: string) => {
        if (isLoading) return
        setIsLoading(true)
        try {
            await invoke('edit_note', { noteId, name, color })
        } catch (error) {
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    const editFolder = async (folderId: number, name: string, color?: string) => {
        if (isLoading) return
        setIsLoading(true)
        try {
            await invoke('edit_folder', { folderId, name, color })
        } catch (error) {
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    /* ------------------------------------------------------------------------------------ */
    // Deleting methods

    const deleteFolder = async (id: number) => {
        if (isLoading) return
        setIsLoading(true)
        try {
            await deleteDBFolder(id)
        } catch (error) {
            setError('Errore eliminazione folder')
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    const deleteNote = async (id: number) => {
        if (isLoading) return
        setIsLoading(true)
        try {
            await deleteDBNote(id)
        } catch (error) {
            setError('Errore eliminazione nota')
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    const deleteSection = async (id: number) => {
        if (isLoading) return
        setIsLoading(true)
        try {
            await deleteDBSection(id)
        } catch (error) {
            setError('Errore eliminazione section')
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    const deleteTask = async (id: number) => {
        if (isLoading) return
        setIsLoading(true)
        try {
            await deleteDBTask(id)
        } catch (error) {
            setError('Errore eliminazione task')
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
            getGroups,
            createWorkspaceFolder,
            createWorkspaceNote,
            createSubFolder,
            createNoteInFolder,
            createSection,
            createSectionInGroup,
            createTask,
            createSubTask,
            editNote,
            editFolder,
            deleteFolder,
            deleteNote,
            deleteSection,
            deleteTask,
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
