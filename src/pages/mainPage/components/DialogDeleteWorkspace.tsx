import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useWorkspace } from "@/contexts/workspace-context"
import React, { useState } from "react"
import { toast } from "sonner"

type DialogDeleteProps = {
    workspaceId: number
    onClosePopover?: () => void;
}

export const DialogDeleteWorkspace = ({ workspaceId, onClosePopover }: DialogDeleteProps) => {

    const [isOpen, setIsOpen] = useState(false)
    const { deleteWorkspace, getWorkspaces } = useWorkspace()

    const handleDelete = async () => {
        try {
            await deleteWorkspace(workspaceId)
            await getWorkspaces()
            setIsOpen(false)
            onClosePopover?.()
        } catch (error: any) {
            toast.error('Impossibile eliminare il Workspace')
        }
    }

    const handleCancel = async (e: React.MouseEvent) => {
        e.stopPropagation()
        onClosePopover?.()
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    onClick={(e) => { e.stopPropagation() }}
                    variant={"ghost"}
                    size={"sm"}
                    className="text-destructive hover:text-destructive hover:!bg-destructive/15 justify-start rounded-xs"
                >
                    Elimina
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="text-destructive">
                        Stai per eliminare il Workspace
                    </DialogTitle>
                    <DialogDescription>
                        Sei sicuro? Questa operazione non può essere annullata!
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button
                        onClick={handleCancel}
                        variant="outline"
                    >
                        Annulla
                    </Button>
                    <Button variant="destructive" onClick={handleDelete}>
                        Elimina
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}