import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useWorkspace } from "@/contexts/workspace-context"
import type { Folder } from "@/types/types"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import { useEffect, useState } from "react"
import { Palette, X } from "lucide-react"
import { toast } from "sonner"

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
    const defaultFolder: defaultFolderType = { name: folder.name, color: folder.color }
    const [newFolder, setFolder] = useState(defaultFolder)
    const [paletteIsOpen, setPaletteOpen] = useState(false)
    const { editFolder, getWorkspaceData } = useWorkspaceData()
    const { currentWorkspace } = useWorkspace()
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (folder.color) {
            setPaletteOpen(true)
            setFolder({ name: folder.name, color: folder.color })
        }
        else
            setFolder({ name: folder.name, color: "#FFFFFF" })
    }, [folder])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!currentWorkspace) return
        if (newFolder.name.trim() === "") return
        try {
            await editFolder(folder.id, newFolder.name.trim(), paletteIsOpen ? newFolder.color : undefined)
            await getWorkspaceData(currentWorkspace.id)
            setError(null)
            onOpenChange(false)
        } catch (err: any) {
            // setError(err.message)
            toast.error(err.message)
        }
    }

    const handleCancel = () => {
        setError(null)
        setPaletteOpen(false)
        setFolder(defaultFolder)
        onOpenChange(false)
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent >
                <DialogHeader>
                    <DialogTitle>Modifica la cartella</DialogTitle>
                    <DialogDescription />
                </DialogHeader>
                <form onSubmit={handleSave}>
                    <div className="grid gap-4">
                        <div className="grid gap-3">
                            <Label>Nome</Label>
                            <Input
                                id="name-1"
                                name="name"
                                value={newFolder.name}
                                onChange={e => {
                                    setError(null)
                                    setFolder({ ...newFolder, name: e.target.value })
                                }}
                            />
                            {error && <p className=" text-xs text-destructive">{error}</p>}
                        </div>
                        {paletteIsOpen ?
                            <div className="flex items-center justify-between gap-1">
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
                                        onChange={e => setFolder({
                                            ...newFolder,
                                            color: e.target.value
                                        })}
                                    />
                                </div>
                                <Button
                                    type="button"
                                    onClick={() => {
                                        setPaletteOpen(false)
                                        setFolder({ ...newFolder, color: "#FFFFFF" })
                                    }}
                                    variant={"buttonIcon"}
                                    className="h-full"
                                >
                                    <X />
                                </Button>
                            </div>
                            :
                            <Button
                                type="button"
                                variant={"outline"}
                                onClick={() => { setPaletteOpen(true) }}
                                className="h-full">
                                Aggiungi colore
                                <Palette />
                            </Button>
                        }
                    </div>
                    <DialogFooter className="mt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancel}
                        >
                            Annulla
                        </Button>
                        <Button
                            type="submit"
                            disabled={!newFolder.name}
                        >
                            Salva
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog >
    )
}