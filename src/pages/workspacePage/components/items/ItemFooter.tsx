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
        <div className={`group gap-2 py-1 px-2 cursor-pointer relative w-full flex items-center rounded-xs border bg-background hover:bg-accent opacity-50 hover:opacity-100 overflow-x-hidden ${className}`}>
            {/* Text + Icon */}
            <Icon className="size-4 shrink-0" />
            <h1 className="text-left text-sm w-full truncate pr-6">
                {text}
            </h1>
        </div>
    )
}