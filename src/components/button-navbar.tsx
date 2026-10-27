import type React from "react"
import { cn } from "@/lib/utils"
import { focusRing } from "@/lib/a11y"
import { TooltipCustom } from "./tooltip-custom"

type ButtonNavbarProps = {
    children: React.ReactNode
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
    className?: string
    window?: boolean
    textTooltip?: string
    /** Accessible name; defaults to the tooltip text. */
    label?: string
    textTooltipShortcut?: string
}

export const ButtonNavbar = ({ children, onClick, className, window, textTooltip, textTooltipShortcut, label }: ButtonNavbarProps) => {
    return (
        <TooltipCustom text={textTooltip} shortcut={textTooltipShortcut}>
            <button
                type="button"
                aria-label={label ?? textTooltip}
                onClick={onClick}
                className={cn(`${focusRing} relative flex items-center justify-center cursor-pointer text-foreground hover:bg-accent after:absolute after:inset-x-0 after:-inset-y-1 after:content-[''] ${window ? "p-2" : "size-6"}`, className)}>
                {children}
            </button>
        </TooltipCustom>
    )
}