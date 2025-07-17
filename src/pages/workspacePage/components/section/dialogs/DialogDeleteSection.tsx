import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import { toast } from "sonner"

type DialogDeleteProps = {
    sectionId: number
    isOpen: boolean
    onOpenChange: (open: boolean) => void
}

export const DialogDeleteSection = ({ sectionId, isOpen, onOpenChange }: DialogDeleteProps) => {

    const { deleteSection, getNoteData, currentNote } = useWorkspaceData()

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (!currentNote) return
        try {
            await deleteSection(sectionId)
            await getNoteData(currentNote.id)
            onOpenChange(false)
        } catch (err: any) {
            toast.error("Impossibile eliminare la section")
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="text-destructive">
                        Stai per eliminare la section
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