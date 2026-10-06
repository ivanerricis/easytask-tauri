import { useTranslation } from "react-i18next"
import { useActiveNoteId } from "@/contexts/use-tabs"
import { ChevronDown, Folder as FolderIcon, FolderOpen } from "lucide-react"
import React, { useState } from "react"
import { DropLine } from "../sidebar/DropLine"
import { useItemSize } from "../sidebar/item-size"
import { isInsideZone, stopDragActivation, treeRowKey, treeRowKeyDown, useTreeRow, wasTreeJustDragged } from "../sidebar/tree-row"
import { SelectionMark } from "../sidebar/SelectionMark"
import { handleSelectionClick } from "../sidebar/selection"
import { useIsSelected, useSelectionStore } from "../sidebar/selection-context"
import type { DropZone } from "../sidebar/tree-dnd"
import { ButtonMenuFolder } from "./ButtonMenuFolder"
import { ItemMenuButton } from "@/components/item-menu"
import type { Folder } from "@/types/types"
import { focusRing } from "@/lib/a11y"
import { TooltipCustom } from "@/components/tooltip-custom"
import { useColorAlpha } from "@/contexts/use-color-alpha"
import { formatDate, hexToRgba } from "@/lib/utils"

/** Whether the note is anywhere inside the folder (subfolders included). */
const holdsNote = (folder: Folder, noteId: number): boolean =>
    folder.notes.some(note => note.id === noteId) || (folder.subfolders ?? []).some(sub => holdsNote(sub, noteId))

type ItemFolderProps = {
    folder: Folder
    className?: string
    children?: React.ReactNode
    isOpen: boolean
    onToggle: (folderId: number) => void
    /** Drop feedback while another item is dragged over this row. */
    dropZone?: DropZone | null
}

export const ItemFolder = React.memo(({ folder, children, isOpen, onToggle, dropZone = null }: ItemFolderProps) => {
    const { t } = useTranslation()
    const [isHovered, setIsHovered] = useState(false)
    const { ref, attributes, listeners, isDragging } = useTreeRow("folder", folder.id)

    const size = useItemSize()
    const colorAlpha = useColorAlpha()
    const hasContent = React.Children.count(children) > 0
    const store = useSelectionStore()
    const selected = useIsSelected("folder", folder.id)
    // A collapsed folder hides the open note: it gets a discreet mark so that the note can be found again
    const activeNoteId = useActiveNoteId()
    const holdsActiveNote = !isOpen && activeNoteId !== null && holdsNote(folder, activeNoteId)

    // Ctrl/Cmd+click and Shift+click only select; a plain click toggles the folder and clears the selection
    const handleClick = (e: React.MouseEvent) => {
        if (wasTreeJustDragged()) return
        if (handleSelectionClick(store, treeRowKey("folder", folder.id), e)) return
        onToggle(folder.id)
    }
    const handleActivate = () => {
        store?.reset(treeRowKey("folder", folder.id))
        onToggle(folder.id)
    }

    return (
        <div className="relative flex flex-col gap-1 w-full">
            <ButtonMenuFolder folder={folder}>
                <div
                    {...attributes}
                    {...listeners}
                    ref={ref}
                    role="button"
                    onClick={handleClick}
                    aria-selected={selected}
                    data-holds-active={holdsActiveNote || undefined}
                    onKeyDown={treeRowKeyDown(listeners, handleActivate)}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    className={`${focusRing} relative group cursor-pointer gap-1 w-full pl-1 ${size.row} flex items-center rounded-xs border select-none ${selected ? "border-primary" : holdsActiveNote ? "border-primary/60" : "border-accent"} bg-background opacity-85 hover:opacity-100 overflow-hidden ${isDragging ? "opacity-40" : ""} ${isInsideZone(dropZone) ? "ring-2 ring-primary ring-inset" : ""}`}
                    style={{ backgroundColor: `${hexToRgba(colorAlpha.item(isHovered), folder.color)}` }}
                >

                    <DropLine zone={dropZone} />
                    <SelectionMark selected={selected} />
                    <TooltipCustom
                        side="right"
                        sideOffset={size.folderTooltipOffset}
                        text={[
                            t("common.creationDate", { date: formatDate(folder.creation_date), time: folder.creation_time }),
                            t("common.editDate", { date: formatDate(folder.edit_date), time: folder.edit_time })
                        ]}>
                        <div className="flex items-center gap-1 w-full h-full">
                            <ChevronDown className={`${isOpen ? 'rotate-0' : '-rotate-90'} ${size.icon} shrink-0 opacity-85 group-hover:opacity-100`} />
                            {isOpen ? (
                                <FolderOpen className={`${size.icon} shrink-0`} />
                            ) : (
                                <FolderIcon className={`${size.icon} shrink-0`} />
                            )}
                            <span className={`w-full ${size.text} truncate whitespace-nowrap overflow-hidden max-w-[calc(100%-1rem)]`}>
                                {folder.name}
                            </span>
                        </div>
                    </TooltipCustom>
                    <div className={`flex items-center leading-none shrink-0 px-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 ${size.menu}`} {...stopDragActivation}>
                        <ItemMenuButton />
                    </div>
                </div>
            </ButtonMenuFolder>

            {
                isOpen && hasContent && (
                    <div className="relative w-full">
                        <div className={`absolute ${size.guide} h-full w-[1px] bg-foreground/25`} />
                        <div className={`${size.indent} flex flex-col gap-1`}>
                            {children}
                        </div>
                    </div>
                )
            }
        </div >
    )
})