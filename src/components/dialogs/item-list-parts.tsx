import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

type ItemRowProps = {
    icon: LucideIcon
    name: string
    /** Second line: where the item was, what it contains and when. */
    details: string
    /** The action buttons of the row. */
    children: ReactNode
}

/** A row of the trash / archive lists: icon, name with details, and the actions on the right. */
export const ItemRow = ({ icon: Icon, name, details, children }: ItemRowProps) => (
    <div className="flex items-center gap-2 rounded-xs border p-2">
        <Icon className="size-4 shrink-0" />
        <div className="flex flex-col min-w-0 flex-1">
            <span className="truncate text-sm" title={name}>{name}</span>
            <span className="truncate text-xs text-muted-foreground" title={details}>
                {details}
            </span>
        </div>
        {children}
    </div>
)
