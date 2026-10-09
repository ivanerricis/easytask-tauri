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
import { TooltipTrigger } from "@/components/ui/tooltip"
import { TreeRowTooltip } from "../sidebar/TreeRowTooltip"
import { useColorAlpha } from "@/contexts/use-color-alpha"
import { hexToRgba } from "@/lib/utils"
import { useTranslation } from "react-i18next"
import { useInlineRename } from "@/hooks/use-inline-rename"
import { InlineNameInput } from "@/components/inline-name-input"

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
    /** Depth in the tree, starting at 1 (aria-level). */
    level?: number
}

export const ItemFolder = React.memo(({ folder, children, isOpen, onToggle, dropZone = null, level = 1 }: ItemFolderProps) => {
    const { t } = useTranslation()
    const [isHovered, setIsHovered] = useState(false)
    const { ref, attributes, listeners, isDragging } = useTreeRow("folder", folder.id)
    // The sidebar tree is updated by the context: no reload
    const { editing, error, start: startRename, inputProps } = useInlineRename({ itemType: "folder", id: folder.id, name: folder.name })

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
            <TreeRowTooltip
                name={folder.name}
                creationDate={folder.creation_date}
                creationTime={folder.creation_time}
                editDate={folder.edit_date}
                editTime={folder.edit_time}
            >
                <ButtonMenuFolder folder={folder} onRename={startRename}>
                    <TooltipTrigger asChild>
                        <div
                            {...attributes}
                            {...listeners}
                            ref={ref}
                            role="treeitem"
                            aria-label={folder.name}
                            aria-level={level}
                            aria-expanded={isOpen}
                            aria-pressed={undefined}
                            onClick={handleClick}
                            aria-selected={selected}
                            data-holds-active={holdsActiveNote || undefined}
                            onKeyDown={treeRowKeyDown(listeners, handleActivate)}
                            onMouseEnter={() => setIsHovered(true)}
                            onMouseLeave={() => setIsHovered(false)}
                            className={`${focusRing} relative group cursor-pointer gap-1 w-full min-w-0 pl-1 ${size.row} flex items-center rounded-xs border select-none ${selected ? "border-primary" : holdsActiveNote ? "border-primary/60" : "border-accent"} bg-background overflow-hidden ${isDragging ? "opacity-40" : ""} ${isInsideZone(dropZone) ? "ring-2 ring-primary ring-inset" : ""}`}
                            style={{ backgroundColor: `${hexToRgba(colorAlpha.item(isHovered), folder.color)}` }}
                        >

                            <DropLine zone={dropZone} />
                            <SelectionMark selected={selected} />
                            <div className="flex min-w-0 items-center gap-1 w-full h-full">
                                <ChevronDown className={`${isOpen ? 'rotate-0' : '-rotate-90'} ${size.icon} shrink-0`} />
                                {isOpen ? (
                                    <FolderOpen className={`${size.icon} shrink-0`} />
                                ) : (
                                    <FolderIcon className={`${size.icon} shrink-0`} />
                                )}
                                {editing
                                    ? <InlineNameInput {...inputProps} error={error} aria-label={t("common.name")} className={size.text} />
                                    : <span className={`w-full ${size.text} min-w-0 truncate whitespace-nowrap overflow-hidden max-w-[calc(100%-1rem)]`}>
                                        {folder.name}
                                    </span>}
                            </div>
                            <div className={`flex items-center leading-none shrink-0 px-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 ${size.menu}`} {...stopDragActivation}>
                                <ItemMenuButton name={folder.name} />
                            </div>
                        </div>
                    </TooltipTrigger>
                </ButtonMenuFolder>
            </TreeRowTooltip>

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