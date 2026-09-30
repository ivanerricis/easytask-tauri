import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
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
    getItemData: (id: number) => Promise<void>
}

type defaultItemType = {
    id: number
}

export const DialogDeleteItem = <T extends defaultItemType>({ item, itemType, getItemId, isOpen, onOpenChange, getItemData }: DialogDeleteProps<T>) => {
    const { deleteItem } = useWorkspaceData()

    const handleDelete = async (e: React.SyntheticEvent) => {
        e.stopPropagation()
        try {
            await deleteItem(itemType, item.id)
            if (typeof getItemId === "number") {
                await getItemData(getItemId)
            }
            onOpenChange(false)
        } catch (error) {
            toast.error('Impossibile eliminare l\'elemento: ' + getErrorMessage(error))
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
                        Spostare nel cestino?
                    </DialogTitle>
                    <DialogDescription>
                        L'elemento verrà spostato nel cestino. Potrai ripristinarlo in seguito.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button
                            onClick={(e) => { e.stopPropagation() }}
                            variant="outline"
                        >
                            Annulla
                        </Button>
                    </DialogClose>
                    <Button variant="destructive" onClick={handleDelete}>
                        Sposta nel cestino
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog >
    )
}