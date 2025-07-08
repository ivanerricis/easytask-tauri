import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useWorkspace } from "@/contexts/workspace-context"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import { useState } from "react"

type DialogDeleteProps = {
    folderId: number
}

export const DialogDeleteFolder = ({ folderId }: DialogDeleteProps) => {

    const [isOpen, setIsOpen] = useState(false)
    const { deleteFolder, getWorkspaceData } = useWorkspaceData()
    const { currentWorkspace } = useWorkspace()

    const onDelete = async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (!currentWorkspace) return
        try {
            await deleteFolder(folderId)
            await getWorkspaceData(currentWorkspace.id)
            setIsOpen(false)
        } catch (err: any) {

        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    onClick={(e) => { e.stopPropagation() }}
                    size={"sm"}
                    variant={"ghost"}
                    className="text-xs rounded-sm justify-start text-destructive hover:text-destructive hover:!bg-destructive/15">
                    Elimina
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="text-destructive">
                        Stai per eliminare la cartella
                    </DialogTitle>
                    <DialogDescription>
                        Sei sicuro? Questa operazione non può essere annullata!
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline" onClick={(e) => {e.stopPropagation()}}>
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