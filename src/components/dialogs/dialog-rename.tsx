import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import React, { useState } from "react"

type DialogRenameProps<T> = {
    item: T
    itemType: string
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
    const [name, setName] = useState(item.name)
    const [title, setTitle] = useState(item.title)
    const { renameItem } = useWorkspaceData()
    const [error, setError] = useState<string | null>(null)

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            if ((name && name !== item.name) || (title && title !== item.title))
                await renameItem(itemType, item.id, (name && !title) ? name.trim() : (title ?? "").trim())
            if (typeof getItemId === "number") {
                await getItemData(getItemId)
            }
            setError(null)
            onOpenChange(false)
        } catch (err: any) {
            setError(err.message)
        }
    }

    const handleCancel = () => {
        setName(item.name)
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
                            value={name ? name : title}
                            onChange={e => {
                                setError(null)
                                name ? setName(e.target.value) : setTitle(e.target.value)
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
                            disabled={!(name || title)}
                        >
                            Salva
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}