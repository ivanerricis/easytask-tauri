import { useWorkspaceActions } from "@/contexts/workspace-data"
import { useOptionalUndo, useUndoRecorder } from "@/contexts/undo/use-undo"
import { getItemName, isUndoableType } from "@/contexts/undo/commands"
import type { DBItemType } from "@/db/queries/shared_queries"
import { useIsActiveDraft } from "@/contexts/use-template-drafts"
import { toastTrashed } from "@/lib/toast-trashed"

export type DeleteItemOptions<T extends { id: number }> = {
    item: T
    itemType: DBItemType
    /** Id passed to `getItemData` (the item id when missing). */
    getItemId?: number | undefined
    /** Reloads the data after the delete (when the removal is not applied optimistically). */
    getItemData?: (id: number) => Promise<void>
    /** Removes the item from the cached data before the write; returns the function that restores it if the write fails. */
    optimistic?: () => () => void
}

/**
 * Moves an item to the trash: optimistic removal, delete, undo record and toast.
 * @returns A function that does it; when the write fails the optimistic removal is rolled back and the error is rethrown.
 */
export const useDeleteItem = <T extends { id: number }>({ item, itemType, getItemId, getItemData, optimistic }: DeleteItemOptions<T>) => {
    const { deleteItem } = useWorkspaceActions()
    const recorder = useUndoRecorder()
    const undo = useOptionalUndo()?.undo
    const isDraft = useIsActiveDraft()

    return async (): Promise<void> => {
        const rollback = optimistic?.()
        try {
            await deleteItem(itemType, item.id)
            // Without an explicit id the reload gets the deleted item's own (e.g. the home reloads its workspaces)
            await getItemData?.(getItemId ?? item.id)
            const undoable = isUndoableType(itemType)
            if (undoable) recorder.remove(itemType, item.id, getItemName(item))
            toastTrashed(1, undoable ? undo : undefined, isDraft)
        } catch (error) {
            rollback?.()
            throw error
        }
    }
}
