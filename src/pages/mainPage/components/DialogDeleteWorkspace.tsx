import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useWorkspace } from "@/contexts/workspace-context"
import React from "react"
import { toast } from "sonner"

type DialogDeleteProps = {
    workspaceId: number
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export const DialogDeleteWorkspace = ({ workspaceId, isOpen, onOpenChange }: DialogDeleteProps) => {

    const { deleteWorkspace, getWorkspaces } = useWorkspace()

    const handleDelete = async () => {
        try {
            await deleteWorkspace(workspaceId)
            await getWorkspaces()
            onOpenChange(false)
        } catch (error: any) {
            toast.error('Impossibile eliminare il Workspace')
        }
    }

    const handleCancel = async (e: React.MouseEvent) => {
        e.stopPropagation()
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
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