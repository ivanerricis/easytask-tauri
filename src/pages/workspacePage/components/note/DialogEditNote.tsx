import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useWorkspace } from "@/contexts/workspace-context"
import type { Note } from "@/types"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import React, { useEffect, useState } from "react"

type DialogEditProps = {
    note: Note
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

type defaultNoteType = {
    name: string
    color?: string
}

export const DialogEditNote = ({ note, isOpen, onOpenChange }: DialogEditProps) => {
    const defaultNote: defaultNoteType = { name: "", color: "" }
    const [newNote, setNote] = useState(defaultNote)
    const { currentWorkspace } = useWorkspace()
    const { editNote, getWorkspaceData } = useWorkspaceData()
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (note.color)
            setNote({ name: note.name, color: note.color })
        else
            setNote({ name: note.name })
    }, [note])

    const onSave = async () => {
        if (!currentWorkspace) return
        if (newNote.name.trim() === "") return
        try {
            await editNote(note.id, newNote.name.trim(), newNote.color)
            await getWorkspaceData(currentWorkspace.id)
            onOpenChange(false)
        } catch (error: any) {
            if (error.message?.includes('EMPTY_NAME'))
                setError('Il nome della nota non può essere vuoto')
            else if (error.message?.includes('NOTE_EXISTS')) {
                setError('Esiste già una nota con questo nome')
            }
            else if (error.message?.includes('GENERIC_ERROR'))
                setError('Errore durante la creazione della nota')
            return
        } finally {
            setNote(defaultNote)
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
                    <DialogTitle>Modifica la nota</DialogTitle>
                    <DialogDescription />
                </DialogHeader>
                <div className="grid gap-4">
                    <div className="grid gap-3">
                        <Label>Nome</Label>
                        <Input
                            id="name-1"
                            name="name"
                            value={newNote.name}
                            onChange={e => { setNote({ ...newNote, name: e.target.value }) }}
                            onKeyDown={handleKeyDown}
                            onClick={(e) => { e.stopPropagation() }}
                        />
                    </div>
                    {error && <p className="text-destructive">{error}</p>}
                    <div className="grid gap-3">
                        <Label>Colore</Label>
                        <div
                            className="flex items-center justify-center h-full w-full border rounded-xs"
                            style={{ backgroundColor: newNote.color }}
                        >
                            <Input
                                id="color-1"
                                name="color"
                                type="color"
                                className="opacity-0 cursor-pointer"
                                value={newNote.color}
                                onChange={e => { setNote({ ...newNote, color: e.target.value }) }}
                                onClick={(e) => { e.stopPropagation() }}
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline" onClick={(e) => { e.stopPropagation() }}>
                            Annulla
                        </Button>
                    </DialogClose>
                    <Button onClick={(e) => { e.stopPropagation(), onSave() }} disabled={!newNote.name}>
                        Salva
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}