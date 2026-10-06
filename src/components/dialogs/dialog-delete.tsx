import { useTranslation } from "react-i18next"
import { Trash2 } from "lucide-react"
import { ConfirmDialog } from "./dialog-confirm"
import { useWorkspaceData } from "@/contexts/workspace-data"
import { useUndoRecorder } from "@/contexts/undo/use-undo"
import { getItemName, isUndoableType } from "@/contexts/undo/commands"
import { useState } from "react"
import type { DBItemType } from "@/db/queries/shared_queries"
import { getErrorMessage } from "@/lib/utils"

type DialogDeleteProps<T> = {
    item: T
    itemType: DBItemType
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    getItemId?: number | undefined
    /** Reloads the data after the delete (when the removal is not applied optimistically). */
    getItemData?: (id: number) => Promise<void>
    /** Removes the item from the cached data before the write; returns the function that restores it if the write fails. */
    optimistic?: () => () => void
}

type defaultItemType = {
    id: number
}

export const DialogDeleteItem = <T extends defaultItemType>({ item, itemType, getItemId, isOpen, onOpenChange, getItemData, optimistic }: DialogDeleteProps<T>) => {
    const { t } = useTranslation()
    const { deleteItem } = useWorkspaceData()
    const recorder = useUndoRecorder()

    const [error, setError] = useState<string | null>(null)

    const handleDelete = async () => {
        setError(null)
        const rollback = optimistic?.()
        try {
            await deleteItem(itemType, item.id)
            if (typeof getItemId === "number") {
                await getItemData?.(getItemId)
            }
            if (isUndoableType(itemType)) recorder.remove(itemType, item.id, getItemName(item))
            onOpenChange(false)
        } catch (error) {
            rollback?.()
            setError(t("dialogs.delete.error", { message: getErrorMessage(error) }))
        }
    }

    return (
        <ConfirmDialog
            open={isOpen}
            onOpenChange={(open) => { if (!open) setError(null); onOpenChange(open) }}
            destructive
            autoClose={false}
            title={t("dialogs.delete.title")}
            description={t("dialogs.delete.description")}
            confirm={{ label: t("dialogs.delete.confirm"), icon: Trash2, onClick: handleDelete }}
        >
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </ConfirmDialog>
    )
}
