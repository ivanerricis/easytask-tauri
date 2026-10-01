import { createContext } from "react"
import type { TrashedWorkspace, Workspace } from "@/types/types"

export type WorkspaceContextType = {
    workspaces: Workspace[]
    currentWorkspace: Workspace | null
    isLoading: boolean
    error: string | null
    setCurrentWorkspace: React.Dispatch<React.SetStateAction<Workspace | null>>
    getWorkspaces: () => Promise<void>
    createWorkspace: (name: string, color?: string) => Promise<void>
    getTrashedWorkspaces: () => Promise<TrashedWorkspace[]>
    restoreWorkspace: (id: number) => Promise<void>
    purgeWorkspace: (id: number) => Promise<void>
    resetWorkspace: () => void
}

export const WorkspaceContext = createContext<WorkspaceContextType | null>(null)
