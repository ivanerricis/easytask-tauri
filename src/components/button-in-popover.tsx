import { MenuItem } from "@/components/menu-kind"
import { Archive, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Copy, Download, FilePlus, FileText, FileX, FolderInput, FolderPlus, HelpCircle, Info, Link2, LayoutTemplate, ListPlus, Music, OctagonAlert, OctagonX, PaintBucket, Palette, Pen, SquareArrowOutUpRight, Trash2, Upload, Zap } from "lucide-react"
import React from "react"

type ButtonInPopoverProps = {
    text: string
    type: string
    children?: React.ReactNode
    className?: string
    destructive?: boolean
    /** Greyed out and not clickable (e.g. "Move up" on the first item). */
    disabled?: boolean
    onClick?: () => void | Promise<void>
}

const iconMap: Record<string, React.ElementType> = {
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
    delete: Trash2,
}

export const ButtonInPopover = React.memo(({ text, type, children, className, destructive, disabled, onClick }: ButtonInPopoverProps) => {
    const IconComponent = iconMap[type] || HelpCircle

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
