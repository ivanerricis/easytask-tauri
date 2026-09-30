import { Trash2, Upload } from "lucide-react"
import type { LucideIcon } from "lucide-react"

type IconType = 'trash' | 'download'

type ItemFooterProps = {
    text: string
    type: IconType
    className?: string
    onClick?: () => void
    badge?: number
}

const iconMap: Record<IconType, LucideIcon> = {
    trash: Trash2,
    download: Upload
}

export const ItemFooter = ({ text, type, className, onClick, badge }: ItemFooterProps) => {

    const Icon = iconMap[type]

    return (
        <button
            type="button"
            onClick={onClick}
            className={`group gap-2 py-1 px-2 cursor-pointer relative w-full flex items-center rounded-xs border bg-background hover:bg-accent opacity-50 hover:opacity-100 focus-visible:opacity-100 overflow-x-hidden ${className ?? ""}`}
        >
            {/* Text + Icon */}
            <Icon className="size-4 shrink-0" />
            <span className="text-left text-sm w-full truncate pr-6">
                {text}
            </span>
            {badge !== undefined && badge > 0 && (
                <span
                    aria-label={`${badge} elementi nel cestino`}
                    className="absolute right-2 min-w-5 rounded-full bg-primary px-1 text-center text-xs text-primary-foreground"
                >
                    {badge}
                </span>
            )}
        </button>
    )
}
