import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
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

    const pendingOps = useRef(0)

    /**
     * Runs an async operation and keeps isLoading true while any operation is in flight.
     * @param operation The operation to run.
     * @category Workspace Context
     */
    const withLoading = useCallback(async (operation: () => Promise<void>) => {
        pendingOps.current += 1
        setIsLoading(true)
        try {
            await operation()
        } finally {
            pendingOps.current -= 1
            setIsLoading(pendingOps.current > 0)
        }
    }, [])

    /**
     * Retrieves the list of workspaces.
     * @throws Will throw an error if the workspaces cannot be retrieved.
     * @category Workspace Context
     */
    const getWorkspaces = useCallback(() => withLoading(async () => {
        const data = await getDBWorkspaces()
        setWorkspaces(data ?? [])
    }), [withLoading])

    const createWorkspace = useCallback((name: string, color?: string) => withLoading(async () => {
        await createDBWorkspace(name, color ?? null)
        const data = await getDBWorkspaces()
        setWorkspaces(data ?? [])
    }), [withLoading])

    /**
     * Resets the current workspace and clears any errors.
     * @category Workspace Context
     */
    const resetWorkspace = useCallback(() => {
        setCurrentWorkspace(null)
        setError(null)
    }, [])

    const value = useMemo(() => ({
        workspaces,
        currentWorkspace,
        isLoading,
        error,
        getWorkspaces,
        createWorkspace,
        setCurrentWorkspace,
        resetWorkspace
    }), [workspaces, currentWorkspace, isLoading, error, getWorkspaces, createWorkspace, resetWorkspace])

    return (
        <WorkspaceContext.Provider value={value}>
            {children}
        </WorkspaceContext.Provider>
    )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useWorkspace = () => {
    const context = useContext(WorkspaceContext)
    if (!context) {
        throw new Error('useWorkspace must be used within a WorkspaceProvider')
    }
    return context
}
