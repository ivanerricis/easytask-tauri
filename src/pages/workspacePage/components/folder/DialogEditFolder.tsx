import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useWorkspace } from "@/contexts/workspace-context"
import type { Folder } from "@/types/types"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import { useEffect, useState } from "react"

type DialogEditProps = {
    folder: Folder
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

type defaultFolderType = {
    name: string
    color?: string
}

export const DialogEditFolder = ({ folder, isOpen, onOpenChange }: DialogEditProps) => {
    const defaultFolder: defaultFolderType = { name: "", color: "" }
    const [newFolder, setFolder] = useState(defaultFolder)
    const { editFolder, getWorkspaceData } = useWorkspaceData()
    const { currentWorkspace } = useWorkspace()
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (folder.color)
            setFolder({ name: folder.name, color: folder.color })
        else
            setFolder({ name: folder.name })
    }, [folder])

    const onSave = async () => {
        if (!currentWorkspace) return
        if (folder.name.trim() === "") return
        try {
            await editFolder(folder.id, newFolder.name.trim(), newFolder.color)
            await getWorkspaceData(currentWorkspace.id)
            onOpenChange(false)
        } catch (error: any) {
            if (error.message?.includes('EMPTY_NAME'))
                setError('Il nome della cartella non può essere vuoto')
            else if (error.message?.includes('FOLDER_EXISTS')) {
                setError('Esiste già una cartella con questo nome')
            }
            else if (error.message?.includes('GENERIC_ERROR'))
                setError('Errore durante la creazione della cartella')
            return
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
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent onClick={(e) => { e.stopPropagation() }}>
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
                            onClick={(e) => { e.stopPropagation() }}
                        />
                    </div>
                    {error && <p className="text-destructive">{error}</p>}
                    <div className="grid gap-3">
                        <Label>Colore</Label>
                        <div
                            className="flex items-center justify-center h-full w-full border rounded-xs"
                            style={{ backgroundColor: newFolder.color }}
                        >
                            <Input
                                id="color-1"
                                name="color"
                                type="color"
                                className="opacity-0 cursor-pointer"
                                value={newFolder.color}
                                onChange={e => { setFolder({ ...newFolder, color: e.target.value }) }}
                                onClick={(e) => { e.stopPropagation() }}
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button onClick={(e) => { e.stopPropagation() }} variant="outline">
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