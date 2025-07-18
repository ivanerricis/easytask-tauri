import { Button } from "@/components/ui/button"
import {
    Dialog,
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

const defaultNote = {
    name: "",
    color: "#ffb375"
}

type ParentFolderProps = {
    parentFolder: Folder
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export function DialogAddNote({ parentFolder, isOpen, onOpenChange }: ParentFolderProps) {
    const [note, setNote] = useState(defaultNote)
    const [error, setError] = useState<string | null>(null)
    const [paletteIsOpen, setPaletteOpen] = useState(false)
    const { createNoteInFolder, getWorkspaceData } = useWorkspaceData()
    const { currentWorkspace } = useWorkspace()

    const handleCreateNote = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!currentWorkspace?.id) return
        if (note.name.trim() === "") return
        try {
            await createNoteInFolder(parentFolder.id, note.name.trim(), paletteIsOpen ? note.color : undefined)
            await getWorkspaceData(currentWorkspace.id)
            setError(null)
            onOpenChange(false)
            setPaletteOpen(false)
            setNote(defaultNote)
        } catch (err: any) {
            setError(err.message)
        }
    }

    const handleCancel = (e: React.MouseEvent) => {
        e.stopPropagation()
        setNote(defaultNote)
        setError(null)
        setPaletteOpen(false)
        onOpenChange(false)
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]" onClick={(e) => { e.stopPropagation() }}>
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
                                onChange={(e) => {
                                    setError(null)
                                    setNote({ ...note, name: e.target.value })
                                }}
                                onClick={(e) => { e.stopPropagation() }}
                            />
                        </div>
                        {error && <p className="text-xs text-red-500">{error}</p>}
                        {paletteIsOpen ?
                            <div className="flex items-center justify-between gap-1">
                                <div
                                    className="flex items-center justify-center h-full w-full border rounded-xs"
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