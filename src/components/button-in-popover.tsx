import { MenuItem } from "@/components/menu-kind"
import { Archive, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Copy, Download, FilePlus, FileText, FileX, FolderInput, FolderPlus, Info, Link2, LayoutTemplate, ListPlus, Music, OctagonAlert, OctagonX, PaintBucket, Palette, Pen, SquareArrowOutUpRight, Trash2, Upload, Zap, ListCollapse, ListChevronsUpDown } from "lucide-react"
import React from "react"

type ButtonInPopoverProps = {
    text: string
    /** The icon of the entry: only the names of the map below (a typo is a compile error, not a "?" icon). */
    type: ButtonInPopoverIcon
    children?: React.ReactNode
    className?: string
    destructive?: boolean
    /** Greyed out and not clickable (e.g. "Move up" on the first item). */
    disabled?: boolean
    onClick?: () => void | Promise<void>
}

const iconMap = {
    open: SquareArrowOutUpRight,
    details: Info,
    addFolder: FolderPlus,
    addNote: FilePlus,
    rename: Pen,
    color: Palette,
    move: FolderInput,
    moveUp: ArrowUp,
    moveDown: ArrowDown,
    moveLeft: ArrowLeft,
    moveRight: ArrowRight,
    colorContent: PaintBucket,
    addPriority: OctagonAlert,
    removePriority: OctagonX,
    addDescription: FileText,
    removeDescription: FileX,
    addSubtask: ListPlus,
    addAudio: Music,
    createTemplate: LayoutTemplate,
    duplicate: Copy,
    export: Upload,
    import: Download,
    relink: Link2,
    archive: Archive,
    automations: Zap,
    collapseAll: ListCollapse,
    expandAll: ListChevronsUpDown,
    delete: Trash2,
} satisfies Record<string, React.ElementType>

export type ButtonInPopoverIcon = keyof typeof iconMap

export const ButtonInPopover = React.memo(({ text, type, children, className, destructive, disabled, onClick }: ButtonInPopoverProps) => {
    const IconComponent = iconMap[type]

    return (
        <MenuItem
            variant={destructive ? "destructive" : "default"}
            disabled={disabled}
            className={className}
            onSelect={() => { void onClick?.() }}
        >
            <IconComponent />
            {text}
            {children}
        </MenuItem>
    )
})
