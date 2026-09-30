import { cn } from "@/lib/utils"
import type { SettingsCategory } from "./categories"

type SettingsNavProps = {
    categories: SettingsCategory[]
    activeId: string
    onSelect: (id: string) => void
}

export const SettingsNav = ({ categories, activeId, onSelect }: SettingsNavProps) => (
    <nav
        aria-label="Categorie impostazioni"
        className="flex sm:flex-col gap-1 overflow-x-auto sm:overflow-visible sm:w-48 shrink-0 border-b sm:border-b-0 sm:border-r pb-2 sm:pb-0 sm:pr-3"
    >
        {categories.map(({ id, label, icon: Icon }) => {
            const active = id === activeId
            return (
                <button
                    key={id}
                    type="button"
                    aria-current={active ? "page" : undefined}
                    onClick={() => onSelect(id)}
                    className={cn(
                        "flex items-center gap-2 rounded-xs px-3 py-2 text-sm text-left whitespace-nowrap outline-none transition-colors",
                        "hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
                        active && "bg-primary/10 text-primary font-medium"
                    )}
                >
                    <Icon className="size-4 shrink-0" />
                    {label}
                </button>
            )
        })}
    </nav>
)
