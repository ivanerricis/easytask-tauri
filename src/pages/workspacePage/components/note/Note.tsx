import type { Note } from "@/types/types"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import { File } from "lucide-react"
import { ButtonMenuNote } from "./ButtonMenuNote"
import React, { useCallback, useState } from "react"
import { formatDate, hexToRgba } from "@/lib/utils"
import { DropLine } from "../sidebar/DropLine"
import { stopDragActivation, useTreeRow, wasTreeJustDragged } from "../sidebar/tree-row"
import type { DropZone } from "../sidebar/tree-dnd"
import { TooltipCustom } from "@/components/tooltip-custom"

type ItemNoteProps = {
    note: Note
    className?: string
    /** Drop feedback while another item is dragged over this row. */
    dropZone?: DropZone | null
}

export const ItemNote = React.memo(({ note, className, dropZone = null }: ItemNoteProps) => {
    const { ref, attributes, listeners, isDragging } = useTreeRow("note", note.id)
    const [isHovered, setIsHovered] = useState(false)
    const { setCurrentNotes, setCurrentNote, getNoteData } = useWorkspaceData()

    const handleOpenFile = useCallback(async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (wasTreeJustDragged()) return
        await getNoteData(note.id)
        setCurrentNotes(prev => prev.some(n => n.id === note.id) ? prev : [...prev, note])
        setCurrentNote(note)
    }, [note, getNoteData, setCurrentNotes, setCurrentNote])

    return (
        <div
            {...attributes}
            {...listeners}
            ref={ref}
            role="button"
            onClick={handleOpenFile}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`relative group cursor-pointer w-full h-7 flex items-center opacity-85 bg-background hover:opacity-100 rounded-xs border border-accent overflow-x-hidden ${isDragging ? "opacity-40" : ""} ${className ?? ""}`}
            style={{ backgroundColor: `${hexToRgba(isHovered ? 0.5 : 0.3, note.color)}` }}
        >
            <DropLine zone={dropZone} />
            {/* Icon + Text */}
            <TooltipCustom
                side="right"
                sideOffset={33}
                text={[
                    "Data creazione: " + formatDate(note.creation_date) + " " + note.creation_time,
                    "Data modifica: " + formatDate(note.edit_date) + " " + note.edit_time
                ]}>
                <div className="flex items-center gap-1 px-1 overflow-hidden w-full">
                    <File className="size-4 shrink-0 text-foreground" />
                    <h1 className="text-sm text-foreground truncate whitespace-nowrap overflow-hidden max-w-[calc(100%-1rem)]">
                        {note.name}
                    </h1>
                </div>
            </TooltipCustom>
            <div className="shrink-0 px-1 opacity-0 group-hover:opacity-100" {...stopDragActivation}>
                <ButtonMenuNote note={note} />
            </div>
        </div>
    )
})