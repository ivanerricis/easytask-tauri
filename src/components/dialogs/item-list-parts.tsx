import { useRef, type KeyboardEvent, type ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { focusRing } from "@/lib/a11y"
import { ITEM_ICONS, typePanelId, typeTabId } from "./item-list-utils"

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

type TypeTabsProps<T extends keyof typeof ITEM_ICONS> = {
    types: readonly T[]
    active: T
    onSelect: (type: T) => void
    count: (type: T) => number
    label: (type: T) => string
    ariaLabel: string
    /** Prefix of the ids of the tabs and panels (see typeTabId / typePanelId in item-list-utils). */
    idPrefix: string
}

/** Vertical tabs of the trash / archive dialogs: one per kind of item, with its count. Arrows move between them (Home/End jump to the ends). */
export function TypeTabs<T extends keyof typeof ITEM_ICONS>({ types, active, onSelect, count, label, ariaLabel, idPrefix }: TypeTabsProps<T>) {
    const tabRefs = useRef(new Map<T, HTMLButtonElement>())

    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        const index = types.indexOf(active)
        let next: number
        if (e.key === "ArrowDown" || e.key === "ArrowRight") next = (index + 1) % types.length
        else if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = (index - 1 + types.length) % types.length
        else if (e.key === "Home") next = 0
        else if (e.key === "End") next = types.length - 1
        else return
        e.preventDefault()
        onSelect(types[next])
        tabRefs.current.get(types[next])?.focus()
    }

    return (
        <div
            role="tablist"
            aria-label={ariaLabel}
            aria-orientation="vertical"
            onKeyDown={handleKeyDown}
            className="flex sm:flex-col gap-1 overflow-x-auto sm:overflow-visible sm:w-48 shrink-0 border-b sm:border-b-0 sm:border-r pb-2 sm:pb-0 sm:pr-3"
        >
            {types.map(type => {
                const TypeIcon: LucideIcon = ITEM_ICONS[type]
                const isActive = type === active
                return (
                    <button
                        key={type}
                        ref={node => { if (node) tabRefs.current.set(type, node); else tabRefs.current.delete(type) }}
                        type="button"
                        role="tab"
                        id={typeTabId(idPrefix, type)}
                        aria-selected={isActive}
                        aria-controls={typePanelId(idPrefix, type)}
                        tabIndex={isActive ? 0 : -1}
                        onClick={() => onSelect(type)}
                        className={cn(
                            "flex items-center gap-2 rounded-xs px-3 py-2 text-sm text-left whitespace-nowrap transition-colors hover:bg-accent",
                            focusRing,
                            isActive && "bg-primary/10 text-primary font-medium"
                        )}
                    >
                        <TypeIcon className="size-4 shrink-0" />
                        {label(type)}
                        <span className="ml-auto text-xs text-muted-foreground">{count(type)}</span>
                    </button>
                )
            })}
        </div>
    )
}
