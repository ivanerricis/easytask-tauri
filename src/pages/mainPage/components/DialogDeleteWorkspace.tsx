import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useWorkspace } from "@/contexts/workspace-context"
import { useState } from "react"

type DialogDeleteProps = {
    workspaceId: number
}

export const DialogDeleteWorkspace = ({ workspaceId }: DialogDeleteProps) => {

    const [isOpen, setIsOpen] = useState(false)
    const { deleteWorkspace, getWorkspaces } = useWorkspace()

    const onDelete = async () => {
        try {
            await deleteWorkspace(workspaceId)
            await getWorkspaces()
            setIsOpen(false)
        } catch (err: any) {

        }
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
                    <DialogClose asChild>
                        <Button variant="outline">
                            Annulla
                        </Button>
                    </DialogClose>
                    <Button variant="destructive" onClick={onDelete}>
                        Elimina
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}