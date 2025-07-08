import { cn } from "@/lib/utils"

interface SideBarHeaderProps {
    children?: React.ReactNode
    text?: string
    className?: string
}

export const SideBarHeader = ({ children, text, className }: SideBarHeaderProps) => {
    return (
        <div className={cn("flex flex-row items-center bg-background justify-between w-full p-1 border-border", className)}>
            {text && <h1 className="font-semibold text-left w-full">
                {text}
            </h1>}
            {children && <div className="flex items-center justify-start w-full gap-1">
                {children}
            </div>}
        </div>
    )
}