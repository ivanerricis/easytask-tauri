import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { EllipsisVertical } from "lucide-react"
import React from "react"
import { DialogDeleteNote } from "../dialogs/DialogDeleteNote"
import type { Note } from "@/types"
import { DialogEditNote } from "../dialogs/DialogEditNote"

type ButtonMenuNoteProps = {
    note: Note
}

export const ButtonMenuNote = ({ note }: ButtonMenuNoteProps) => {

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation()
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button onClick={handleClick} className="p-1 rounded-sm cursor-pointer">
                    <EllipsisVertical className="!h-4 !w-4" />
                </button>
            </PopoverTrigger>
            <PopoverContent className="flex flex-col justify-center gap-1 w-26 p-1 rounded-sm">
                <Button size={"sm"} variant={"ghost"} className="text-xs rounded-sm justify-start">
                    Apri
                </Button>
                <DialogEditNote note={note}/>
                <DialogDeleteNote noteId={note.id} />
            </PopoverContent>
        </Popover>
    )
}