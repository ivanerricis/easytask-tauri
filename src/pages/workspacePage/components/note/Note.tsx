import { useTranslation } from "react-i18next"
import type { Note } from "@/types/types"
import { useActiveNoteId, useTabsActions } from "@/contexts/use-tabs"
import { File } from "lucide-react"
import { ButtonMenuNote } from "./ButtonMenuNote"
import { ItemMenuButton } from "@/components/item-menu"
import React, { useCallback, useState } from "react"
import { useColorAlpha } from "@/contexts/use-color-alpha"
import { formatDate, hexToRgba } from "@/lib/utils"
import { useItemSize } from "../sidebar/item-size"
import { DropLine } from "../sidebar/DropLine"
import { stopDragActivation, treeRowKey, treeRowKeyDown, useTreeRow, wasTreeJustDragged } from "../sidebar/tree-row"
import { SelectionMark } from "../sidebar/SelectionMark"
import { handleSelectionClick } from "../sidebar/selection"
import { useIsSelected, useSelectionStore } from "../sidebar/selection-context"
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
    const { t } = useTranslation()
    const { ref, attributes, listeners, isDragging } = useTreeRow("note", note.id)
    const [isHovered, setIsHovered] = useState(false)
    const size = useItemSize()
    const colorAlpha = useColorAlpha()
    const { openNote } = useTabsActions()
    const store = useSelectionStore()
    const selected = useIsSelected("note", note.id)
    // The note open in the active tab
    const isActive = useActiveNoteId() === note.id

    // Ctrl/Cmd+click and Shift+click only select; a plain click opens the note and clears the selection
    const handleOpenFile = useCallback((e: React.MouseEvent) => {
        e.stopPropagation()
        if (wasTreeJustDragged()) return
        if (handleSelectionClick(store, treeRowKey("note", note.id), e)) return
        openNote(note.id)
    }, [note.id, openNote, store])

    const handleActivate = () => {
        store?.reset(treeRowKey("note", note.id))
        openNote(note.id)
    }

    return (
        <ButtonMenuNote note={note}>
            <div
                {...attributes}
                {...listeners}
                ref={ref}
                role="button"
                onClick={handleOpenFile}
                aria-selected={selected}
                aria-current={isActive ? "true" : undefined}
                onKeyDown={treeRowKeyDown(listeners, handleActivate)}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={`${focusRing} relative group cursor-pointer w-full ${size.row} flex items-center opacity-85 bg-background hover:opacity-100 rounded-xs border select-none ${selected || isActive ? "border-primary" : "border-accent"} ${isActive ? "ring-1 ring-inset ring-primary" : ""} overflow-hidden ${isDragging ? "opacity-40" : ""} ${className ?? ""}`}
                style={{ backgroundColor: `${hexToRgba(colorAlpha.item(isHovered), note.color)}` }}
            >
                <DropLine zone={dropZone} />
                <SelectionMark selected={selected} />
                {/* Icon + Text */}
                <TooltipCustom
                    side="right"
                    sideOffset={size.noteTooltipOffset}
                    text={[
                        t("common.creationDate", { date: formatDate(note.creation_date), time: note.creation_time }),
                        t("common.editDate", { date: formatDate(note.edit_date), time: note.edit_time })
                    ]}>
                    <div className="flex items-center gap-1 px-1 overflow-hidden w-full">
                        <File className={`${size.icon} shrink-0 text-foreground`} />
                        <span className={`${size.text} ${isActive ? "font-semibold" : ""} text-foreground truncate whitespace-nowrap overflow-hidden max-w-[calc(100%-1rem)]`}>
                            {note.name}
                        </span>
                    </div>
                </TooltipCustom>
                <div className={`flex items-center leading-none shrink-0 px-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 ${size.menu}`} {...stopDragActivation}>
                    <ItemMenuButton />
                </div>
            </div>
        </ButtonMenuNote>
    )
})