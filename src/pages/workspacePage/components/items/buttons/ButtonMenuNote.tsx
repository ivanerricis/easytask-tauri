import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { EllipsisVertical } from "lucide-react"
import React from "react"
import { DialogDeleteNote } from "../dialogs/DialogDeleteNote"
import type { Note } from "@/types"
import { DialogEditNote } from "../dialogs/DialogEditNote"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import { Button } from "@/components/ui/button"

type ButtonMenuNoteProps = {
    note: Note
}

export const ButtonMenuNote = ({ note }: ButtonMenuNoteProps) => {
    const { setCurrentNotes, setCurrentNote, getNoteData } = useWorkspaceData()

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation()
    }

    const handleOpenNote = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentNotes((prev: Note[]) => {
            const alreadyExists = prev.some(n => n.id === note.id)
            return alreadyExists ? prev : [...prev, note]
        })
        setCurrentNote(note)
        getNoteData(note.id)
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button onClick={handleClick} className="p-1 rounded-xs cursor-pointer">
                    <EllipsisVertical className="!h-4 !w-4" />
                </button>
            </PopoverTrigger>
            <PopoverContent className="flex flex-col justify-center gap-1 w-26 p-1 rounded-xs">
                <Button onClick={handleOpenNote} size={"sm"} variant={"ghost"} className="text-sm rounded-xs justify-start">
                    Apri
                </Button>
                <DialogEditNote note={note} />
                <DialogDeleteNote noteId={note.id} />
            </PopoverContent>
        </Popover>
    )
}