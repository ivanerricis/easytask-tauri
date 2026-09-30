import type { Note } from "@/types/types"
import { useTabsActions } from "@/contexts/tabs-context"
import { File } from "lucide-react"
import { ButtonMenuNote } from "./ButtonMenuNote"
import { ItemMenuButton } from "@/components/item-menu"
import React, { useCallback, useState } from "react"
import { formatDate, hexToRgba } from "@/lib/utils"
import { useItemSize } from "../sidebar/item-size"
import { DropLine } from "../sidebar/DropLine"
import { stopDragActivation, treeRowKeyDown, useTreeRow, wasTreeJustDragged } from "../sidebar/tree-row"
import type { DropZone } from "../sidebar/tree-dnd"
import { focusRing } from "@/lib/a11y"
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
    const size = useItemSize()
    const { openNote } = useTabsActions()

    const handleOpenFile = useCallback((e: React.MouseEvent) => {
        e.stopPropagation()
        if (wasTreeJustDragged()) return
        openNote(note.id)
    }, [note.id, openNote])

    return (
        <ButtonMenuNote note={note}>
            <div
                {...attributes}
                {...listeners}
                ref={ref}
                role="button"
                onClick={handleOpenFile}
                onKeyDown={treeRowKeyDown(listeners, () => openNote(note.id))}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={`${focusRing} relative group cursor-pointer w-full ${size.row} flex items-center opacity-85 bg-background hover:opacity-100 rounded-xs border border-accent overflow-x-hidden ${isDragging ? "opacity-40" : ""} ${className ?? ""}`}
                style={{ backgroundColor: `${hexToRgba(isHovered ? 0.5 : 0.3, note.color)}` }}
            >
                <DropLine zone={dropZone} />
                {/* Icon + Text */}
                <TooltipCustom
                    side="right"
                    sideOffset={size.noteTooltipOffset}
                    text={[
                        "Data creazione: " + formatDate(note.creation_date) + " " + note.creation_time,
                        "Data modifica: " + formatDate(note.edit_date) + " " + note.edit_time
                    ]}>
                    <div className="flex items-center gap-1 px-1 overflow-hidden w-full">
                        <File className={`${size.icon} shrink-0 text-foreground`} />
                        <span className={`${size.text} text-foreground truncate whitespace-nowrap overflow-hidden max-w-[calc(100%-1rem)]`}>
                            {note.name}
                        </span>
                    </div>
                </TooltipCustom>
                <div className={`shrink-0 px-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 ${size.menu}`} {...stopDragActivation}>
                    <ItemMenuButton />
                </div>
            </div>
        </ButtonMenuNote>
    )
})