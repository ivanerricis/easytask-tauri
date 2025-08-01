import { cn } from "@/lib/utils"
import { FilePlus, FileText, FileX, FolderPlus, HelpCircle, OctagonAlert, OctagonX, PaintBucket, Palette, Pen, SquareArrowOutUpRight, Trash2 } from "lucide-react"
import React from "react"

type ButtonInPopoverProps = {
    text: string
    type: string
    children?: React.ReactNode
    className?: string
    destructive?: boolean
    onClick?: () => void | Promise<void>
}

const iconMap: Record<string, React.ElementType> = {
    open: SquareArrowOutUpRight,
    addFolder: FolderPlus,
    addNote: FilePlus,
    rename: Pen,
    color: Palette,
    colorContent: PaintBucket,
    addPriority: OctagonAlert,
    removePriority: OctagonX,
    addDescription: FileText,
    removeDescription: FileX,
    delete: Trash2,
}

export const ButtonInPopover = React.memo(({ text, type, children, className, destructive, onClick }: ButtonInPopoverProps) => {
    const IconComponent = iconMap[type] || HelpCircle

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()
        onClick?.()
    }

    return (
        <button
            onClick={handleClick}
            className={cn(`${destructive ? "text-destructive hover:text-destructive hover:!bg-destructive/15" : "hover:text-foreground"}
                flex justify-start items-center w-full rounded-xs text-xs px-1 py-1.5 text-left hover:bg-accent cursor-pointer gap-2 text-nowrap`,
                className)}
        >
            <IconComponent className="size-4" />
            {text}
            {children}
        </button>
    )
})