import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useWorkspaceData } from "@/contexts/workspace-data"
import React, { useState } from "react"
import type { DBItemType } from "@/db/queries/shared_queries"
import { getErrorMessage } from "@/lib/utils"

type DialogRenameProps<T> = {
    item: T
    itemType: DBItemType
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    getItemId?: number | undefined
    /** Reloads the data after the rename (when the change is not applied optimistically). */
    getItemData?: (id: number) => Promise<void>
    /** Applies the new name to the cached data before the write; returns the function that undoes it if the write fails. */
    optimistic?: (name: string) => () => void
}

type defaultItemType = {
    id: number
    name?: string | null
    title?: string
}

export const DialogRenameItem = <T extends defaultItemType>({ item, itemType, isOpen, onOpenChange, getItemData, getItemId, optimistic }: DialogRenameProps<T>) => {
    const currentName = item.name ?? item.title ?? ""
    const [value, setValue] = useState(currentName)
    const { renameItem } = useWorkspaceData()
    const [error, setError] = useState<string | null>(null)
    // A group may be unnamed: saving an empty name clears it
    const allowEmpty = itemType === "section_group"

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault()
        let rollback: (() => void) | undefined
        try {
            if ((allowEmpty || value.trim()) && value.trim() !== currentName) {
                rollback = optimistic?.(value.trim())
                await renameItem(itemType, item.id, value.trim())
            }
            if (typeof getItemId === "number") {
                await getItemData?.(getItemId)
            }
            setError(null)
            onOpenChange(false)
        } catch (err) {
            rollback?.()
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
                            disabled={!allowEmpty && !value.trim()}
                        >
                            Salva
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}