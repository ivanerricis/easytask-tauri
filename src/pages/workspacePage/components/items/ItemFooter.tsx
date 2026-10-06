import { useTranslation } from "react-i18next"
import { Archive, Download, LayoutTemplate, Trash2 } from "lucide-react"
import type { LucideIcon } from "lucide-react"

type IconType = 'trash' | 'archive' | 'download' | 'template'

type ItemFooterProps = {
    text: string
    type: IconType
    className?: string
    onClick?: () => void
    disabled?: boolean
    badge?: number
    /** Accessible label of the badge (default: the number of items in the trash). */
    badgeLabel?: string
}

const iconMap: Record<IconType, LucideIcon> = {
    trash: Trash2,
    archive: Archive,
    download: Download,
    template: LayoutTemplate
}

export const ItemFooter = ({ text, type, className, onClick, disabled, badge, badgeLabel }: ItemFooterProps) => {
    const { t } = useTranslation()

    const Icon = iconMap[type]

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`group gap-2 py-1 px-2 cursor-pointer relative w-full flex items-center rounded-xs border bg-background hover:bg-accent opacity-70 hover:opacity-100 focus-visible:opacity-100 disabled:pointer-events-none disabled:opacity-30 overflow-x-hidden ${className ?? ""}`}
        >
            {/* Text + Icon */}
            <Icon className="size-4 shrink-0" />
            <span className="text-left text-sm w-full truncate pr-6">
                {text}
            </span>
            {badge !== undefined && badge > 0 && (
                <span
                    aria-label={badgeLabel ?? t("sidebar.trashBadge", { count: badge })}
                    className="absolute right-2 min-w-5 rounded-full bg-primary px-1 text-center text-xs text-primary-foreground"
                >
                    {badge}
                </span>
            )}
        </button>
    )
}
