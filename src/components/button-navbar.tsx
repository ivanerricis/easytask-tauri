import type React from "react"
import { cn } from "@/lib/utils"

type ButtonNavbarProps = {
    children: React.ReactNode
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
    className?: String
}

export const ButtonNavbar = ({ children, onClick, className }: ButtonNavbarProps) => {
    return (
        <button
            onClick={onClick}
            className={cn("flex items-center justify-center cursor-pointer text-primary hover:bg-accent opacity-75 hover:opacity-100 p-2", className)}>
            {children}
        </button>
    )
}