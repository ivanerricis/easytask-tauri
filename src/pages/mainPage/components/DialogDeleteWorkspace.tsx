import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useWorkspace } from "@/contexts/workspace-context"
import { DialogClose } from "@radix-ui/react-dialog"
import React from "react"
import { toast } from "sonner"

type DialogDeleteProps = {
    workspaceId: number
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export const DialogDeleteWorkspace = ({ workspaceId, isOpen, onOpenChange }: DialogDeleteProps) => {

    const { deleteWorkspace, getWorkspaces } = useWorkspace()

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation()
        try {
            await deleteWorkspace(workspaceId)
            await getWorkspaces()
            onOpenChange(false)
        } catch (error: any) {
            toast.error('Impossibile eliminare il Workspace')
        }
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
                    <DialogClose asChild>
                        <Button
                            onClick={(e) => {e.stopPropagation()}}
                            variant="outline"
                        >
                            Annulla
                        </Button>
                    </DialogClose>
                    <Button variant="destructive" onClick={handleDelete}>
                        Elimina
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}