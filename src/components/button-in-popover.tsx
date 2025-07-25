import { cn } from "@/lib/utils"
import { FilePlus, FolderPlus, HelpCircle, OctagonAlert, OctagonX, PaintBucket, Palette, Pen, SquareArrowOutUpRight, Trash } from "lucide-react"
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
    delete: Trash,
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
                flex justify-start items-center w-full rounded-xs text-sm px-1 py-1.5 text-left hover:bg-accent cursor-pointer gap-2 text-nowrap`,
                className)}
        >
            <IconComponent className="w-4 h-4" />
            {text}
            {children}
        </button>
    )
})