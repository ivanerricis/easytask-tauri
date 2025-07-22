import { cn } from "@/lib/utils"

type ButtonInPopoverProps = {
    text: string
    children?: React.ReactNode
    className?: string
    destructive?: boolean
    onClick?: () => void | Promise<void>
}

export const ButtonInPopover = ({ text, children, className, destructive, onClick }: ButtonInPopoverProps) => {

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()
        onClick?.()
    }

    return (
        <button
            onClick={handleClick}
            className={cn(`${destructive ? "text-destructive hover:text-destructive hover:!bg-destructive/15" : "hover:text-foreground"}
                justify-start rounded-xs text-xs px-1 py-1.5 text-left hover:bg-secondary cursor-pointer`,
                className)}
        >
            {text}
            {children}
        </button>
    )
}