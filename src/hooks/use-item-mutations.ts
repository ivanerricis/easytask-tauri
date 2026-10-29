import { useCallback } from "react"
import { useWorkspaceActions } from "@/contexts/workspace-data"
import { useUndoRecorder } from "@/contexts/undo/use-undo"
import { withRollback } from "@/contexts/with-rollback"
import { reportError } from "@/lib/report-error"
import { getErrorMessage } from "@/lib/utils"
import type { DBItemType } from "@/db/queries/shared_queries"

type Rollback = () => void

/**
 * The optimistic color change and archive of an item of the open note (task, section or group), shared by their menus.
 * @param kind Type of the item, as the archive and the undo recorder know it.
 * @param patch Applies a patch to the cached tree; returns what undoes it.
 * @param remove Removes the item from the cached tree; returns what puts it back.
 * @returns `addColorItem` (applied at once, restored and rethrown if the write fails) and `archive` (removed at once, put back if
 *   the write fails, errors reported, one undo step). The caller closes its menu.
 * @category Hooks
 */
export function useItemMutations(
    kind: "task" | "section" | "section_group",
    patch: (id: number, patch: { color: string | null }) => Rollback,
    remove: (id: number) => Rollback,
) {
    const { updateItemColor, archiveItem } = useWorkspaceActions()
    const recorder = useUndoRecorder()

    const addColorItem = useCallback(async (itemType: DBItemType, itemId: number, color?: string) => {
        const rollback = patch(itemId, { color: color ?? null })
        try {
            await updateItemColor(itemType, itemId, color)
        } catch (error) {
            rollback()
            throw error
        }
    }, [patch, updateItemColor])

    const archive = useCallback(async (id: number, label: string | null | undefined) => {
        try {
            await withRollback(remove(id), () => archiveItem(kind, id))
            recorder.archive(kind, id, label)
        } catch (error) {
            reportError(error, getErrorMessage(error))
        }
    }, [kind, remove, archiveItem, recorder])

    return { addColorItem, archive }
}
