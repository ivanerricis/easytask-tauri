import { useWorkspace } from "@/contexts/use-workspace"
import { useWorkspaceActions } from "@/contexts/workspace-data"
import { useActiveNoteActions } from "@/contexts/use-active-note"

/**
 * Reloads the data of the open workspace and then the open note: after restoring or removing items from the trash or the
 * archive (folders and notes live in the sidebar tree, groups, sections and tasks in the open note). Does nothing
 * without an open workspace.
 */
export function useWorkspaceRefresh() {
    const { currentWorkspace } = useWorkspace()
    const { getWorkspaceData } = useWorkspaceActions()
    const { refreshActiveNote } = useActiveNoteActions()
    const workspaceID = currentWorkspace?.id

    return async () => {
        if (workspaceID === undefined) return
        await getWorkspaceData(workspaceID)
        await refreshActiveNote()
    }
}
