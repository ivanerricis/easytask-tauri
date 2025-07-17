import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useWorkspace } from "@/contexts/workspace-context"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import { toast } from "sonner"

type DialogDeleteProps = {
    noteId: number
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export const DialogDeleteNote = ({ noteId, isOpen, onOpenChange }: DialogDeleteProps) => {

    const { deleteNote, getWorkspaceData, setCurrentNotes, setCurrentNote, currentNotes } = useWorkspaceData()
    const { currentWorkspace } = useWorkspace()

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (!currentWorkspace) return
        try {
            await deleteNote(noteId)
            await getWorkspaceData(currentWorkspace.id)
            const updatedNotes = currentNotes.filter(n => n.id !== noteId)
            setCurrentNotes(updatedNotes)

            if (updatedNotes.length > 0) {
                const currentIndex = currentNotes.findIndex(n => n.id === noteId)

                if (currentIndex === updatedNotes.length) {
                    setCurrentNote(updatedNotes[currentIndex - 1])
                } else {
                    setCurrentNote(updatedNotes[currentIndex])
                }
            } else {
                setCurrentNote(null)
            }
            onOpenChange(false)
        } catch (err: any) {
            toast.error('Impossibile elimianre la nota')
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
                    <Button variant="destructive" onClick={handleDelete}>
                        Elimina
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}