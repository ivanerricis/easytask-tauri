import { cn } from "@/lib/utils"
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Copy, Download, FilePlus, FileText, FileX, FolderInput, FolderPlus, HelpCircle, Info, LayoutTemplate, ListPlus, Music, OctagonAlert, OctagonX, PaintBucket, Palette, Pen, SquareArrowOutUpRight, Trash2 } from "lucide-react"
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
    export: Download,
    delete: Trash2,
}

export const ButtonInPopover = React.memo(({ text, type, children, className, destructive, disabled, onClick }: ButtonInPopoverProps) => {
    const IconComponent = iconMap[type] || HelpCircle

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()
        if (!disabled) onClick?.()
    }

    return (
        <button
            onClick={handleClick}
            disabled={disabled}
            className={cn(`${destructive ? "text-destructive hover:text-destructive hover:!bg-destructive/15" : "hover:text-foreground"}
                flex justify-start items-center w-full rounded-xs text-xs px-1 py-1.5 text-left hover:bg-accent cursor-pointer gap-2 text-nowrap`,
                disabled && "opacity-40 pointer-events-none cursor-default",
                className)}
        >
            <IconComponent className="size-4" />
            {text}
            {children}
        </button>
    )
})