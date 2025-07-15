import { Trash2, Upload } from "lucide-react"
import type { LucideIcon } from "lucide-react"

type IconType = 'trash' | 'download'

type ItemFooterProps = {
    text: string
    type: IconType
    className?: string
}

const iconMap: Record<IconType, LucideIcon> = {
    trash: Trash2,
    download: Upload
}

export const ItemFooter = ({ text, type, className }: ItemFooterProps) => {

    const Icon = iconMap[type]

    return (
        <div className={`group gap-2 py-1 px-2 cursor-pointer relative w-full flex items-center rounded-xs border bg-background opacity-50 hover:opacity-100 overflow-x-hidden ${className}`}>
            {/* Text + Icon */}
            <Icon className="w-5 h-5 shrink-0 text-foreground" />
            <h1 className="text-left text-sm text-foreground w-full truncate pr-6">
                {text}
            </h1>
        </div>
    )
}