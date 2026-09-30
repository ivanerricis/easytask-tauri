import { ChevronDown, Folder as FolderIcon, FolderOpen } from "lucide-react"
import React, { useState } from "react"
import { DropLine } from "../sidebar/DropLine"
import { isInsideZone, stopDragActivation, useTreeRow, wasTreeJustDragged } from "../sidebar/tree-row"
import type { DropZone } from "../sidebar/tree-dnd"
import { ButtonMenuFolder } from "./ButtonMenuFolder"
import type { Folder } from "@/types/types"
import { TooltipCustom } from "@/components/tooltip-custom"
import { formatDate, hexToRgba } from "@/lib/utils"

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
    const [isHovered, setIsHovered] = useState(false)
    const { ref, attributes, listeners, isDragging } = useTreeRow("folder", folder.id)

    const hasContent = React.Children.count(children) > 0

    return (
        <div className="relative flex flex-col gap-1 w-full">
            <div
                {...attributes}
                {...listeners}
                ref={ref}
                role="button"
                onClick={() => { if (!wasTreeJustDragged()) onToggle(folder.id) }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={`relative group cursor-pointer gap-1 w-full pl-1 h-7 flex items-center rounded-xs border border-accent bg-background opacity-85 hover:opacity-100 overflow-x-hidden ${isDragging ? "opacity-40" : ""} ${isInsideZone(dropZone) ? "ring-2 ring-primary ring-inset" : ""}`}
                style={{ backgroundColor: `${hexToRgba(isHovered ? 0.5 : 0.3, folder.color)}` }}
            >

                <DropLine zone={dropZone} />
                <TooltipCustom
                    side="right"
                    sideOffset={37}
                    text={[
                        "Data creazione: " + formatDate(folder.creation_date) + " " + folder.creation_time,
                        "Data modifica: " + formatDate(folder.edit_date) + " " + folder.edit_time
                    ]}>
                    <div className="flex items-center gap-1 w-full h-full">
                        <ChevronDown className={`${isOpen ? 'rotate-0' : '-rotate-90'} size-4 shrink-0 opacity-85 group-hover:opacity-100`} />
                        {isOpen ? (
                            <FolderOpen className="size-4 shrink-0" />
                        ) : (
                            <FolderIcon className="size-4 shrink-0" />
                        )}
                        <h1 className="w-full text-sm truncate whitespace-nowrap overflow-hidden max-w-[calc(100%-1rem)]">
                            {folder.name}
                        </h1>
                    </div>
                </TooltipCustom>
                <div className="shrink-0 px-1 opacity-0 group-hover:opacity-100" {...stopDragActivation}>
                    <ButtonMenuFolder folder={folder} />
                </div>
            </div>

            {
                isOpen && hasContent && (
                    <div className="relative w-full">
                        <div className="absolute left-[9px] h-full w-[1px] bg-foreground/15" />
                        <div className="ml-[17px] flex flex-col gap-1">
                            {children}
                        </div>
                    </div>
                )
            }
        </div >
    )
})