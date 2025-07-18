import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useWorkspace } from "@/contexts/workspace-context"
import type { Folder } from "@/types/types"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import React, { useState } from "react"
import { Palette, X } from "lucide-react"

const defaultFolder = {
    name: "",
    color: "#ffb375"
}

type ParentFolderProps = {
    parentFolder: Folder
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export function DialogAddSubFolder({ parentFolder, isOpen, onOpenChange }: ParentFolderProps) {
    const [folder, setFolder] = useState(defaultFolder)
    const [error, setError] = useState<string | null>(null)
    const [paletteIsOpen, setPaletteOpen] = useState(false)
    const { createSubFolder, getWorkspaceData } = useWorkspaceData()
    const { currentWorkspace } = useWorkspace()

    const handleCreateFolder = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!currentWorkspace?.id) return
        if (folder.name.trim() === "") return
        try {
            await createSubFolder(parentFolder.id, folder.name.trim(), paletteIsOpen ? folder.color : undefined)
            await getWorkspaceData(currentWorkspace.id)
            setError(null)
            onOpenChange(false)
            setPaletteOpen(false)
            setFolder(defaultFolder)
        } catch (err: any) {
            setError(err.message)
        }
    }

    const handleCancel = (e: React.MouseEvent) => {
        e.stopPropagation()
        setFolder(defaultFolder)
        setError(null)
        setPaletteOpen(false)
        onOpenChange(false)
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]" onClick={(e) => { e.stopPropagation() }}>
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
                                onChange={(e) => {
                                    setError(null)
                                    setFolder({ ...folder, name: e.target.value })
                                }}
                                onClick={(e) => { e.stopPropagation() }}
                            />
                            {error && <p className="text-xs text-destructive">{error}</p>}
                        </div>
                        {paletteIsOpen ?
                            <div className="flex items-center justify-between gap-1">
                                <div
                                    className="flex items-center justify-center h-full w-full border rounded-xs"
                                    style={{ backgroundColor: folder.color }}
                                >
                                    <Input
                                        id="color-1"
                                        name="color"
                                        type="color"
                                        className="opacity-0 cursor-pointer"
                                        value={folder.color}
                                        onChange={e => setFolder({
                                            ...folder,
                                            color: e.target.value
                                        })}
                                    />
                                </div>
                                <Button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault()
                                        setPaletteOpen(false)
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
                                onClick={(e) => {
                                    e.preventDefault()
                                    setPaletteOpen(true)
                                }}
                                className="h-full">
                                Aggiungi colore
                                <Palette />
                            </Button>
                        }
                    </div>
                    <DialogFooter className="mt-4">
                        <DialogClose asChild>
                            <Button
                                variant="outline"
                                type="button"
                                onClick={handleCancel}>
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