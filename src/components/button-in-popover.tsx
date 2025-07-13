import { Button } from "./ui/button"
import { cn } from "@/lib/utils"

type ButtonInPopoverProps = {
    text: string
    children?: React.ReactNode
    className?: string
    destructive?: boolean
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
}

export const ButtonInPopover = ({ text, children, className, destructive, onClick }: ButtonInPopoverProps) => {

    return (
        <Button
            onClick={e => {
                e.stopPropagation()
                onClick?.(e)
            }}
            variant={"ghost"}
            size={"sm"}
            className={cn(`${destructive ? "text-destructive hover:text-destructive hover:!bg-destructive/15" : "hover:text-foreground"} justify-start rounded-xs text-sm`,
                className)}
        >
            {text}
            {children}
        </Button>
    )
}