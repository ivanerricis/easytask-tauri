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
    const { createNoteInFolder, getWorkspaceData } = useWorkspaceData()
    const { currentWorkspace } = useWorkspace()

    const handleCreateNote = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!currentWorkspace?.id) return
        if (note.name.trim() === "") return
        try {
            await createNoteInFolder(parentFolder.id, note.name.trim(), note.color)
            await getWorkspaceData(currentWorkspace.id)
            setError(null)
            onOpenChange(false)
        } catch (error: any) {
            console.log(error.message)
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

    const handleCancel = (e: React.MouseEvent) => {
        e.stopPropagation()
        setNote(defaultNote)
        setError(null)
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
                                onChange={(e) => setNote({ ...note, name: e.target.value })}
                                onClick={(e) => { e.stopPropagation() }}
                            />
                        </div>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                        <div className="grid gap-3">
                            <Label>Colore</Label>
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
                                    onChange={(e) => setNote({ ...note, color: e.target.value })}
                                    onClick={(e) => { e.stopPropagation() }}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="mt-4">
                        <Button variant="outline" type="button" onClick={handleCancel}>
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