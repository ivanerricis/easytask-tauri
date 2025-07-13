import { ButtonInPopover } from "@/components/button-in-popover"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useWorkspace } from "@/contexts/workspace-context"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import { useState } from "react"

type DialogDeleteProps = {
    noteId: number
}

export const DialogDeleteNote = ({ noteId }: DialogDeleteProps) => {

    const [isOpen, setIsOpen] = useState(false)
    const { deleteNote, getWorkspaceData, setCurrentNotes } = useWorkspaceData()
    const { currentWorkspace } = useWorkspace()

    const onDelete = async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (!currentWorkspace) return
        try {
            await deleteNote(noteId)
            await getWorkspaceData(currentWorkspace.id)
            setCurrentNotes(prev => prev.filter(n => n.id !== noteId))
            setIsOpen(false)
        } catch (err: any) {

        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <ButtonInPopover text="Elimina" onClick={() => { setIsOpen(true) }} destructive />
            </DialogTrigger>
            <DialogContent onClick={(e) => { e.stopPropagation() }}>
                <DialogHeader>
                    <DialogTitle className="text-destructive">
                        Stai per eliminare la nota
                    </DialogTitle>
                    <DialogDescription>
                        Sei sicuro? Questa operazione non può essere annullata!
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline" onClick={(e) => { e.stopPropagation() }}>
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