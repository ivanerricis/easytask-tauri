import { useTranslation } from "react-i18next"
import { useContext } from "react"
import { PreferencesContext } from "@/contexts/preferences-context-object"
import { useSubmitOnce } from "@/hooks/use-submit-once"
import { reportError } from "@/lib/report-error"
import { getErrorMessage } from "@/lib/utils"
import { useWorkspaceActions } from "@/contexts/workspace-data"
import { useOptionalUndo, useUndoRecorder } from "@/contexts/undo/use-undo"
import { getItemName, isUndoableType } from "@/contexts/undo/commands"
import type { DBItemType } from "@/db/queries/shared_queries"
import { useIsActiveDraft } from "@/contexts/use-template-drafts"
import { toastTrashed } from "@/lib/toast-trashed"

type DeleteItemOptions<T extends { id: number }> = {
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

type DeleteRequestOptions<T extends { id: number }> = DeleteItemOptions<T> & {
    /** Tells whether the item holds something worth a confirmation (a rejection counts as yes). */
    hasContent: () => boolean | Promise<boolean>
    /** Opens the confirmation dialog. */
    openDialog: () => void
}

/**
 * Entry point of the delete menus of notes, sections and groups: asks for the confirmation only when needed.
 * With the preference on the dialog opens only for an item with content; with it off the item is never confirmed.
 * Without confirmation the item goes to the trash at once (undo toast included); a failure is reported with an error toast.
 * @returns `request` to call from the menu entry.
 */
export const useDeleteRequest = <T extends { id: number }>({ hasContent, openDialog, ...deleteOptions }: DeleteRequestOptions<T>) => {
    const { t } = useTranslation()
    // Read straight from the context: outside a provider (menus rendered alone) the default applies, which is to ask
    const confirmDeleteWithContent = useContext(PreferencesContext)?.confirmDeleteWithContent
    const deleteNow = useDeleteItem(deleteOptions)
    const { run } = useSubmitOnce()

    const request = () => {
        void run(async () => {
            let confirm = false
            if (confirmDeleteWithContent !== false) {
                try {
                    confirm = await hasContent()
                } catch (error) {
                    reportError(error)
                    confirm = true
                }
            }
            if (confirm) {
                openDialog()
                return
            }
            try {
                await deleteNow()
            } catch (error) {
                reportError(error, t("dialogs.delete.error", { message: getErrorMessage(error) }))
            }
        })
    }

    return { request }
}
