import { createContext, useContext } from "react"
import { createRequiredContextHook } from "@/lib/required-context"
import { useWorkspaceVersion } from "./versions"
import type { WorkspaceActionsType, WorkspaceStateType } from "./types"

export const WorkspaceStateContext = createContext<WorkspaceStateType | null>(null)
export const WorkspaceActionsContext = createContext<WorkspaceActionsType | null>(null)
export const WorkspaceLoadingContext = createContext<boolean>(false)

/**
 * The workspace data (folders, notes, trees, current folder, error, loaded workspace). The version counters are not part of
 * it (see useWorkspaceVersion), so a consumer of the tree does not re-render when one is bumped.
 * @category Workspace Data Context
 */
export const useWorkspaceState = createRequiredContextHook(WorkspaceStateContext, "useWorkspaceState", "WorkspaceDataProvider")

/**
 * The stable workspace actions (their identity never changes).
 * @category Workspace Data Context
 */
export const useWorkspaceActions = createRequiredContextHook(WorkspaceActionsContext, "useWorkspaceActions", "WorkspaceDataProvider")

/**
 * True while any workspace operation is in flight. Kept apart so the other consumers do not re-render when it toggles.
 * @category Workspace Data Context
 */
export const useWorkspaceLoading = () => useContext(WorkspaceLoadingContext)

/**
 * Workspace data and actions together. Tabs and active note data have their own hooks
 * (useTabs, useTabsActions, useActiveNote, useActiveNoteActions).
 *
 * For compatibility the result also carries the four version counters (trashVersion, archiveVersion, audioVersion,
 * templatesVersion), which makes the caller re-render whenever one is bumped: a component that needs a counter should use
 * useWorkspaceVersion, and one that does not should use useWorkspaceState / useWorkspaceActions.
 * @category Workspace Data Context
 */
export const useWorkspaceData = () => ({
    ...useWorkspaceState(),
    ...useWorkspaceActions(),
    trashVersion: useWorkspaceVersion("trash"),
    archiveVersion: useWorkspaceVersion("archive"),
    audioVersion: useWorkspaceVersion("audio"),
    templatesVersion: useWorkspaceVersion("templates"),
})
