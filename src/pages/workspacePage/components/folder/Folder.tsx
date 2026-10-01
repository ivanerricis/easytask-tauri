import { useTranslation } from "react-i18next"
import { ChevronDown, Folder as FolderIcon, FolderOpen } from "lucide-react"
import React, { useState } from "react"
import { DropLine } from "../sidebar/DropLine"
import { useItemSize } from "../sidebar/item-size"
import { isInsideZone, stopDragActivation, treeRowKeyDown, useTreeRow, wasTreeJustDragged } from "../sidebar/tree-row"
import type { DropZone } from "../sidebar/tree-dnd"
import { ButtonMenuFolder } from "./ButtonMenuFolder"
import { ItemMenuButton } from "@/components/item-menu"
import type { Folder } from "@/types/types"
import { focusRing } from "@/lib/a11y"
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
    const { t } = useTranslation()
    const [isHovered, setIsHovered] = useState(false)
    const { ref, attributes, listeners, isDragging } = useTreeRow("folder", folder.id)

    const size = useItemSize()
    const hasContent = React.Children.count(children) > 0

    return (
        <div className="relative flex flex-col gap-1 w-full">
            <ButtonMenuFolder folder={folder}>
                <div
                    {...attributes}
                    {...listeners}
                    ref={ref}
                    role="button"
                    onClick={() => { if (!wasTreeJustDragged()) onToggle(folder.id) }}
                    onKeyDown={treeRowKeyDown(listeners, () => onToggle(folder.id))}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    className={`${focusRing} relative group cursor-pointer gap-1 w-full pl-1 ${size.row} flex items-center rounded-xs border border-accent bg-background opacity-85 hover:opacity-100 overflow-x-hidden ${isDragging ? "opacity-40" : ""} ${isInsideZone(dropZone) ? "ring-2 ring-primary ring-inset" : ""}`}
                    style={{ backgroundColor: `${hexToRgba(isHovered ? 0.5 : 0.3, folder.color)}` }}
                >

                    <DropLine zone={dropZone} />
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
                    <div className={`shrink-0 px-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 ${size.menu}`} {...stopDragActivation}>
                        <ItemMenuButton />
                    </div>
                </div>
            </ButtonMenuFolder>

            {
                isOpen && hasContent && (
                    <div className="relative w-full">
                        <div className={`absolute ${size.guide} h-full w-[1px] bg-foreground/15`} />
                        <div className={`${size.indent} flex flex-col gap-1`}>
                            {children}
                        </div>
                    </div>
                )
            }
        </div >
    )
})