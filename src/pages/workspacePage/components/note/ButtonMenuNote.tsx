import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { EllipsisVertical } from "lucide-react"
import React, { useState } from "react"
import { DialogDeleteNote } from "./DialogDeleteNote"
import type { Note } from "@/types/types"
import { DialogEditNote } from "./DialogEditNote"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import { Button } from "@/components/ui/button"
import { ButtonInPopover } from "@/components/button-in-popover"

type ButtonMenuNoteProps = {
    note: Note
}

export const ButtonMenuNote = ({ note }: ButtonMenuNoteProps) => {
    const { setCurrentNotes, setCurrentNote, getNoteData } = useWorkspaceData()
    const [isEditNoteOpen, setEditNoteOpen] = useState(false);
    const [isDeleteNoteOpen, setDeleteNoteOpen] = useState(false);
    const [popoverOpen, setPopoverOpen] = useState(false);

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation()
    }

    const closeAll = () => {
        setPopoverOpen(false);
    }

    const handleOpenNote = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await getNoteData(note.id)
        setCurrentNotes((prev: Note[]) => {
            const alreadyExists = prev.some(n => n.id === note.id)
            return alreadyExists ? prev : [...prev, note]
        })
        setCurrentNote(note)
    }

    return (
        <>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                    <button onClick={handleClick} className="p-1 rounded-xs cursor-pointer">
                        <EllipsisVertical className="!h-4 !w-4" />
                    </button>
                </PopoverTrigger>
                <PopoverContent
                    onClick={(e) => { e.stopPropagation() }}
                    className="flex flex-col justify-center gap-1 w-auto p-1 rounded-xs"
                >
                    <Button onClick={handleOpenNote} size={"sm"} variant={"ghost"} className="text-sm rounded-xs justify-start">
                        Apri nota
                    </Button>
                    <ButtonInPopover text="Modifica nota" onClick={() => { setEditNoteOpen(true); closeAll() }} />
                    <ButtonInPopover text="Elimina" destructive onClick={() => { setDeleteNoteOpen(true); closeAll() }} />
                </PopoverContent>
            </Popover>

            <DialogEditNote
                note={note}
                isOpen={isEditNoteOpen}
                onOpenChange={setEditNoteOpen}
            />
            <DialogDeleteNote
                noteId={note.id}
                isOpen={isDeleteNoteOpen}
                onOpenChange={setDeleteNoteOpen}
            />
        </>
    )
}