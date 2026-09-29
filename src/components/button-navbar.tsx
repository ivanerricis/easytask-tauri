import type React from "react"
import { cn } from "@/lib/utils"
import { TooltipCustom } from "./tooltip-custom"

type ButtonNavbarProps = {
    children: React.ReactNode
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
    className?: string
    window?: boolean
    textTooltip?: string
    textTooltipShortcut?: string
}

export const ButtonNavbar = ({ children, onClick, className, window, textTooltip, textTooltipShortcut }: ButtonNavbarProps) => {
    return (
        <TooltipCustom text={textTooltip} shortcut={textTooltipShortcut}>
            <button
                onClick={onClick}
                className={cn(`flex items-center justify-center cursor-pointer text-primary hover:bg-accent ${window ? "p-2" : "p-0.5"}`, className)}>
                {children}
            </button>
        </TooltipCustom>
    )
}