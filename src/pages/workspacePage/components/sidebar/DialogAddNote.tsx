import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useWorkspace } from "@/contexts/workspace-context"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import { FilePlus } from "lucide-react"
import { useEffect, useState } from "react"

const defaultNote = {
    name: "",
    color: "#ffb375"
}

export function DialogAddNote() {

    const [note, setNote] = useState(defaultNote)
    const [error, setError] = useState<string | null>(null)
    const [isOpen, setIsOpen] = useState(false)
    const { currentWorkspace } = useWorkspace()
    const { createWorkspaceNote, getWorkspaceData } = useWorkspaceData()

    const handleCreateNote = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!currentWorkspace?.id) return
        if (note.name.trim() === "") return
        try {
            await createWorkspaceNote(currentWorkspace.id, note.name.trim(), note.color)
            await getWorkspaceData(currentWorkspace.id)
            setError(null)
            setIsOpen(false)
        } catch (error: any) {
            if (error.message?.includes('EMPTY_NAME'))
                setError('Il nome della nota non può essere vuoto')
            else if (error.message?.includes('NOTE_EXISTS'))
                setError('Esiste già una nota con questo nome')
            else if (error.message?.includes('GENERIC_ERROR'))
                setError('Errore durante la creazione della nota')
            return
        } finally {
            setNote(defaultNote)
        }
    }

    const handleCancel = () => {
        setNote(defaultNote)
        setError(null)
        setIsOpen(false)
    }

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isTyping = document.activeElement && (
                document.activeElement.tagName === 'INPUT' ||
                document.activeElement.tagName === 'TEXTAREA' ||
                (document.activeElement as HTMLElement).isContentEditable
            )

            if (isTyping) return

            if (e.key === "n" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setIsOpen(true)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant='buttonIcon' size="icon">
                    <FilePlus />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Crea una nota</DialogTitle>
                    <DialogDescription />
                </DialogHeader>
                <form onSubmit={handleCreateNote}>
                    <div className="grid gap-4">
                        <div className="grid gap-3">
                            <Label>Nome</Label>
                            <Input
                                id="name-1"
                                name="name"
                                value={note.name}
                                onChange={e => {
                                    setError(null)
                                    setNote({
                                        ...note,
                                        name: e.target.value
                                    })
                                }}
                            />
                        </div>
                        {error && (<p className="text-destructive">{error}</p>)}
                        <div className="grid gap-3">
                            <Label>Colore</Label>
                            <div className="flex items-center justify-center h-full w-full border rounded-xs"
                                style={{ backgroundColor: note.color }}
                            >
                                <Input
                                    id="color-1"
                                    name="color"
                                    type="color"
                                    className="opacity-0 cursor-pointer"
                                    value={note.color}
                                    onChange={e => setNote({
                                        ...note,
                                        color: e.target.value
                                    })}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="mt-4">
                        <Button
                            variant="outline"
                            type="button"
                            onClick={handleCancel}
                        >
                            Annulla
                        </Button>
                        <Button type="submit" disabled={!note.name.trim()}>
                            Crea nota
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}