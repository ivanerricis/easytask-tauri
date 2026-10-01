import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useWorkspaceData } from "@/contexts/workspace-data"
import { useUndoRecorder } from "@/contexts/undo/use-undo"
import { getItemName, isUndoableType } from "@/contexts/undo/commands"
import { DialogClose } from "@radix-ui/react-dialog"
import React from "react"
import { toast } from "sonner"
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

    const handleDelete = async (e: React.SyntheticEvent) => {
        e.stopPropagation()
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
            toast.error(t("dialogs.delete.error", { message: getErrorMessage(error) }))
        }
    }

    const handleEnter = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Enter") {
            handleDelete(e)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent
                onKeyDown={(e) => handleEnter(e)}
            >
                <DialogHeader>
                    <DialogTitle className="text-destructive">
                        {t("dialogs.delete.title")}
                    </DialogTitle>
                    <DialogDescription>
                        {t("dialogs.delete.description")}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button
                            onClick={(e) => { e.stopPropagation() }}
                            variant="outline"
                        >
                            {t("common.cancel")}
                        </Button>
                    </DialogClose>
                    <Button variant="destructive" onClick={handleDelete}>
                        {t("dialogs.delete.confirm")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog >
    )
}
