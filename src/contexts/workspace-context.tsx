import React, { createContext, useContext, useState } from 'react'
import type { Workspace } from '@/types/types'
import { getDBWorkspaces, createDBWorkspace } from '@/db/queries/workspace'

type WorkspaceContextType = {
    workspaces: Workspace[]
    currentWorkspace: Workspace | null
    isLoading: boolean
    error: string | null
    setCurrentWorkspace: React.Dispatch<React.SetStateAction<Workspace | null>>
    getWorkspaces: () => Promise<void>
    createWorkspace: (name: string, color?: string) => Promise<void>
    resetWorkspace: () => void
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null)

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([])
    const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    /**
     * Retrieves the list of workspaces.
     * @throws Will throw an error if the workspaces cannot be retrieved.
     * @category Workspace Context
     */
    const getWorkspaces = async () => {
        if (isLoading) return
        setIsLoading(true)
        try {
            const data = await getDBWorkspaces()
            setWorkspaces(data ?? [])
        } catch (error: any) {
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    const createWorkspace = async (name: string, color?: string) => {
        if (isLoading) return
        setIsLoading(true)
        try {
            await createDBWorkspace(name, color ?? null)
            await getWorkspaces()
        } catch (error: any) {
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    /**
     * Resets the current workspace and clears any errors.
     * @category Workspace Context
     */
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
            createWorkspace,
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