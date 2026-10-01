import { createContext, useContext } from "react"
import type { WorkspaceActionsType, WorkspaceStateType } from "./types"

export const WorkspaceStateContext = createContext<WorkspaceStateType | null>(null)
export const WorkspaceActionsContext = createContext<WorkspaceActionsType | null>(null)
export const WorkspaceLoadingContext = createContext<boolean>(false)

/**
 * The workspace data (folders, notes, trees, current folder, error, trashVersion, templatesVersion).
 * @category Workspace Data Context
 */
export const useWorkspaceState = () => {
    const context = useContext(WorkspaceStateContext)
    if (!context) throw new Error('useWorkspaceState must be used within a WorkspaceDataProvider')
    return context
}

/**
 * The stable workspace actions (their identity never changes).
 * @category Workspace Data Context
 */
export const useWorkspaceActions = () => {
    const context = useContext(WorkspaceActionsContext)
    if (!context) throw new Error('useWorkspaceActions must be used within a WorkspaceDataProvider')
    return context
}

/**
 * True while any workspace operation is in flight. Kept apart so the other consumers do not re-render when it toggles.
 * @category Workspace Data Context
 */
export const useWorkspaceLoading = () => useContext(WorkspaceLoadingContext)

/**
 * Workspace data and actions together. Tabs and active note data have their own hooks
 * (useTabs, useTabsActions, useActiveNote, useActiveNoteActions).
 * @category Workspace Data Context
 */
export const useWorkspaceData = () => ({ ...useWorkspaceState(), ...useWorkspaceActions() })
