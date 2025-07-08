import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useWorkspace } from "@/contexts/workspace-context"
import type { Folder } from "@/types"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import { useEffect, useState } from "react"

type DialogEditProps = {
    folder: Folder
}

const defaultFolder = {
    name: "",
    color: ""
}

export const DialogEditFolder = ({ folder }: DialogEditProps) => {

    const [isOpen, setIsOpen] = useState(false)
    const [newFolder, setFolder] = useState(defaultFolder)
    const { editFolder, getWorkspaceData } = useWorkspaceData()
    const { currentWorkspace } = useWorkspace()
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        setFolder({
            name: folder.name,
            color: folder.color
        })
    }, [folder])

    const onSave = async () => {
        if (!currentWorkspace) return
        try {
            await editFolder(folder.id, newFolder.name, newFolder.color)
            await getWorkspaceData(currentWorkspace.id)
            setIsOpen(false)
        } catch (error: any) {
            if (error.message?.includes('EMPTY_NAME'))
                setError('Il nome della cartella non può essere vuoto')
            else if (error.message?.includes('FOLDER_EXISTS')) {
                setError('Esiste già una cartella con questo nome')
            }
            else if (error.message?.includes('GENERIC_ERROR'))
                setError('Errore durante la creazione della cartella')
            return // prevenire la chiusura in caso di errore
        } finally {
            setFolder(defaultFolder)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            onSave();
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    onClick={(e) => { e.stopPropagation() }}
                    variant={"ghost"}
                    size={"sm"}
                    className="hover:text-foreground justify-start rounded-sm text-xs"
                >
                    Modifica
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Modifica la cartella</DialogTitle>
                    <DialogDescription />
                </DialogHeader>
                <div className="grid gap-4">
                    <div className="grid gap-3">
                        <Label>Nome</Label>
                        <Input
                            id="name-1"
                            name="name"
                            value={newFolder.name}
                            onChange={e => { setFolder({ ...newFolder, name: e.target.value }) }}
                            onKeyDown={handleKeyDown}
                        />
                    </div>
                    {error && <p className="text-destructive">{error}</p>}
                    <div className="grid gap-3">
                        <Label>Colore</Label>
                        <div
                            className="flex items-center justify-center h-full w-full border rounded-sm"
                            style={{ backgroundColor: newFolder.color }}
                        >
                            <Input
                                id="color-1"
                                name="color"
                                type="color"
                                className="opacity-0 cursor-pointer"
                                value={newFolder.color}
                                onChange={e => { setFolder({ ...newFolder, color: e.target.value }) }}
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button onClick={(e) => {e.stopPropagation()}} variant="outline">
                            Annulla
                        </Button>
                    </DialogClose>
                    <Button onClick={(e) => { e.stopPropagation(), onSave() }} disabled={!newFolder.name}>
                        Salva
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}