import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogClose,
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
import type { Folder } from "@/types"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import React, { useState } from "react"

const defaultFolder = {
    name: "",
    color: "#ffb375"
}

type ParentFolderProps = {
    parentFolder: Folder
}

export function DialogAddSubFolder({ parentFolder }: ParentFolderProps) {
    const [folder, setFolder] = useState({ name: "", color: "#ffb375" })
    const [error, setError] = useState<string | null>(null)
    const [isOpen, setIsOpen] = useState(false)
    const { createSubFolder, getWorkspaceData } = useWorkspaceData()
    const { currentWorkspace } = useWorkspace()

    const handleCreateFolder = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!currentWorkspace?.id) return
        try {
            await createSubFolder(parentFolder.id, folder.name, folder.color)
            await getWorkspaceData(currentWorkspace.id)
            setError(null)
            setIsOpen(false)
        } catch (error: any) {
            if (error.message?.includes('EMPTY_NAME'))
                setError('Il nome della nota non può essere vuoto')
            else if (error.message?.includes('FOLDER_EXISTS'))
                setError('Esiste già una nota con questo nome')
            else if (error.message?.includes('GENERIC_ERROR'))
                setError('Errore durante la creazione della nota')
            return
        } finally {
            setFolder(defaultFolder)
        }
    }

    const handleCancel = (e: React.MouseEvent) => {
        e.stopPropagation()
        setFolder(defaultFolder)
        setError(null)
        setIsOpen(false)
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    onClick={(e) => { e.stopPropagation() }}
                    size={"sm"}
                    variant={"ghost"}
                    className="text-xs rounded-sm justify-start"
                >
                    Aggiungi cartella
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Crea una cartella</DialogTitle>
                    <DialogDescription />
                </DialogHeader>
                <form onSubmit={handleCreateFolder}>
                    <div className="grid gap-4">
                        <div className="grid gap-3">
                            <Label>Nome</Label>
                            <Input
                                id="name-1"
                                name="name"
                                value={folder.name}
                                onChange={(e) => setFolder({ ...folder, name: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-3">
                            <Label>Colore</Label>
                            <div
                                className="flex items-center justify-center h-full w-full border rounded-sm"
                                style={{ backgroundColor: folder.color }}
                            >
                                <Input
                                    id="color-1"
                                    name="color"
                                    type="color"
                                    className="opacity-0 cursor-pointer"
                                    value={folder.color}
                                    onChange={(e) => setFolder({ ...folder, color: e.target.value })}
                                />
                            </div>
                        </div>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                    </div>
                    <DialogFooter className="mt-4">
                        <DialogClose asChild>
                            <Button variant="outline" type="button" onClick={handleCancel}>
                                Annulla
                            </Button>
                        </DialogClose>
                        <Button type="submit" disabled={!folder.name.trim()}>
                            Crea cartella
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}