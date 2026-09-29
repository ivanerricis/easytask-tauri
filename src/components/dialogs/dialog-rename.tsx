import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import React, { useState } from "react"
import type { DBItemType } from "@/db/queries/shared_queries"
import { getErrorMessage } from "@/lib/utils"

type DialogRenameProps<T> = {
    item: T
    itemType: DBItemType
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    getItemId?: number | undefined
    getItemData: (id: number) => Promise<void>
}

type defaultItemType = {
    id: number
    name?: string
    title?: string
}

export const DialogRenameItem = <T extends defaultItemType>({ item, itemType, isOpen, onOpenChange, getItemData, getItemId }: DialogRenameProps<T>) => {
    const currentName = item.name ?? item.title ?? ""
    const [value, setValue] = useState(currentName)
    const { renameItem } = useWorkspaceData()
    const [error, setError] = useState<string | null>(null)

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            if (value.trim() && value !== currentName)
                await renameItem(itemType, item.id, value.trim())
            if (typeof getItemId === "number") {
                await getItemData(getItemId)
            }
            setError(null)
            onOpenChange(false)
        } catch (err) {
            setError(getErrorMessage(err))
        }
    }

    const handleCancel = () => {
        setValue(currentName)
        setError(null)
        onOpenChange(false)
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Rinomina</DialogTitle>
                    <DialogDescription />
                </DialogHeader>
                <form onSubmit={handleEdit}>
                    <div className="grid gap-3">
                        <Input
                            id="name-1"
                            name="name"
                            value={value}
                            onChange={e => {
                                setError(null)
                                setValue(e.target.value)
                            }}
                        />
                        {error && <p className="text-sm text-destructive">{error}</p>}
                    </div>
                    <DialogFooter className="mt-4">
                        <Button
                            variant="outline"
                            type="button"
                            onClick={handleCancel}
                        >
                            Annulla
                        </Button>
                        <Button
                            type="submit"
                            disabled={!value.trim()}
                        >
                            Salva
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}