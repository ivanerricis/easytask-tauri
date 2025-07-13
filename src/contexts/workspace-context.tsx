import React, { createContext, useContext, useState } from 'react'
import { core } from '@tauri-apps/api';
const { invoke } = core;
import type { Workspace } from '@/types'

type WorkspaceContextType = {
    workspaces: Workspace[]
    currentWorkspace: Workspace | null
    isLoading: boolean
    error: string | null
    setCurrentWorkspace: React.Dispatch<React.SetStateAction<Workspace | null>>
    getWorkspaces: () => Promise<void>
    createWorkspace: (name: string, color: string) => Promise<void>
    editWorkspace: (id: number, name: string, color?: string) => Promise<void>
    deleteWorkspace: (id: number) => Promise<void>
    resetWorkspace: () => void
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null)

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([])
    const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const getWorkspaces = async () => {
        if (isLoading) return
        setIsLoading(true)
        try {
            const data: Workspace[] = await invoke('get_workspaces')
            setWorkspaces(data)
        } catch (error) {
            setError('Errore caricamento Workspace')
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    const createWorkspace = async (name: string, color: string) => {
        if (isLoading) return
        setIsLoading(true)
        try {
            await invoke('create_workspace', { name, color })
            await getWorkspaces()
        } catch (error) {
            setError('Errore creazione Workspace')
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    const editWorkspace = async (id: number, name: string, color?: string) => {
        if (isLoading) return
        setIsLoading(true)
        try {
            await invoke('edit_workspace', { id, name, color })
            await getWorkspaces()
        } catch (error) {
            setError('Errore nella modifica del Workspace')
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    const deleteWorkspace = async (id: number) => {
        if (isLoading) return
        setIsLoading(true)
        try {
            await invoke('delete_workspace', { id })
            await getWorkspaces()
        } catch (error) {
            setError('Errore eliminazione Workspace')
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    const resetWorkspace = () => {
        setCurrentWorkspace(null)
        setError(null)
    }

    return (
        <WorkspaceContext.Provider value={{
            workspaces,
            currentWorkspace,
            isLoading,
            error,
            getWorkspaces,
            deleteWorkspace,
            createWorkspace,
            editWorkspace,
            setCurrentWorkspace,
            resetWorkspace
        }}>
            {children}
        </WorkspaceContext.Provider>
    )
}

export const useWorkspace = () => {
    const context = useContext(WorkspaceContext)
    if (!context) {
        throw new Error('useWorkspace must be used within a WorkspaceProvider')
    }
    return context
}