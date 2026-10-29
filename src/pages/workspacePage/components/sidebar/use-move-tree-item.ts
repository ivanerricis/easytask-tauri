import { useCallback } from "react"
import i18n from "@/i18n"
import { useWorkspace } from "@/contexts/use-workspace"
import { useWorkspaceData } from "@/contexts/workspace-data"
import { useUndoRecorder } from "@/contexts/undo/use-undo"
import { captureTreePlace } from "@/contexts/undo/commands"
import { reportError } from "@/lib/report-error"
import { getErrorMessage } from "@/lib/utils"
import type { DropTarget, TreeItemType } from "./tree-dnd"

/** Loads the tree of the current workspace again (after a move, to be sure to show what the backend has); a failure is reported. */
export const useRefreshTree = () => {
    const { currentWorkspace } = useWorkspace()
    const { getWorkspaceData } = useWorkspaceData()
    return useCallback(async () => {
        if (!currentWorkspace) return
        try {
            await getWorkspaceData(currentWorkspace.id)
        } catch (error) {
            reportError(error, i18n.t("errors.refreshTree"))
        }
    }, [currentWorkspace, getWorkspaceData])
}

/**
 * Moves one item of the tree to a place, as one undo step, then loads the tree again. Failures are reported, never thrown.
 * `onMoved` runs right after the move succeeded (before the tree is loaded again).
 */
export const useMoveTreeItem = () => {
    const { workspaceDataTree, moveTreeItem } = useWorkspaceData()
    const recorder = useUndoRecorder()
    const refreshTree = useRefreshTree()
    return useCallback(async (type: TreeItemType, id: number, to: DropTarget, onMoved?: () => void) => {
        try {
            const from = captureTreePlace(workspaceDataTree, type, id)
            await moveTreeItem(type, id, to.folderId, to.index)
            if (from) recorder.treeMove(type, id, from.name, { folderId: from.folderId, index: from.index }, { folderId: to.folderId, index: to.index })
            onMoved?.()
        } catch (error) {
            reportError(error, getErrorMessage(error))
        }
        await refreshTree()
    }, [workspaceDataTree, moveTreeItem, recorder, refreshTree])
}
