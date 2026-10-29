import { cn } from "@/lib/utils"

interface SideBarHeaderProps {
    children?: React.ReactNode
    className?: string
}

export const SideBarHeader = ({ children, className }: SideBarHeaderProps) => {
    return (
        <div className={cn("flex flex-row items-center bg-background justify-between w-full p-1 border-border", className)}>
            {children && <div className="flex flex-wrap items-center justify-start w-full gap-1">
                {children}
            </div>}
        </div>
    )
}