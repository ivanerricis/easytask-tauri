import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useWorkspace } from "@/contexts/workspace-context"
import type { Note } from "@/types/types"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import React, { useEffect, useState } from "react"
import { Palette, X } from "lucide-react"

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
    const defaultNote: defaultNoteType = { name: note.name, color: note.color }
    const [newNote, setNote] = useState(defaultNote)
    const [paletteIsOpen, setPaletteOpen] = useState(false)
    const { currentWorkspace } = useWorkspace()
    const { editNote, getWorkspaceData } = useWorkspaceData()
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (note.color) {
            setPaletteOpen(true)
            setNote({ name: note.name, color: note.color })
        }
        else
            setNote({ name: note.name })
    }, [note])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!currentWorkspace) return
        if (newNote.name.trim() === "") return
        try {
            await editNote(note.id, newNote.name.trim(), paletteIsOpen ? newNote.color : undefined)
            await getWorkspaceData(currentWorkspace.id)
            onOpenChange(false)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setNote(defaultNote)
        }
    }

    const handleCancel = () => {
        setError(null)
        setPaletteOpen(false)
        setNote(defaultNote)
        onOpenChange(false)
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent onClick={(e) => { e.stopPropagation() }}>
                <DialogHeader>
                    <DialogTitle>Modifica la nota</DialogTitle>
                    <DialogDescription />
                </DialogHeader>
                <form onSubmit={handleSave}>
                    <div className="grid gap-4">
                        <div className="grid gap-3">
                            <Label>Nome</Label>
                            <Input
                                id="name-1"
                                name="name"
                                value={newNote.name}
                                onChange={e => {
                                    setError(null)
                                    setNote({ ...newNote, name: e.target.value })
                                }}
                                onClick={(e) => { e.stopPropagation() }}
                            />
                            {error && <p className="text-xs text-destructive">{error}</p>}
                        </div>
                        {paletteIsOpen ?
                            <div className="flex items-center justify-between gap-1">
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
                                        onChange={e => {
                                            setNote({
                                                ...newNote,
                                                color: e.target.value
                                            })
                                        }}
                                    />
                                </div>
                                <Button
                                    type="button"
                                    onClick={() => {
                                        setPaletteOpen(false)
                                        setNote({ ...newNote, color: "#FFFFFF" })
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
                            variant="outline"
                            type="button"
                            onClick={handleCancel}
                        >
                            Annulla
                        </Button>
                        <Button
                            type="submit"
                            disabled={!newNote.name}
                        >
                            Salva
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}