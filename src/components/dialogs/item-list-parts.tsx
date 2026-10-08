import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { Loader2, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ITEM_ICONS } from "./item-list-utils"

type ItemRowProps = {
    icon: LucideIcon
    name: string
    /** Second line (more lines as an array): where the item was, what it contains and when. */
    details: string | readonly string[]
    /** The action buttons of the row. */
    children: ReactNode
}

/** A row of the trash / archive / templates lists: icon, name with details, and the actions on the right. */
export const ItemRow = ({ icon: Icon, name, details, children }: ItemRowProps) => (
    <div className="flex items-center gap-2 rounded-xs border p-2">
        <Icon className="size-4 shrink-0" />
        <div className="flex flex-col min-w-0 flex-1">
            <span className="truncate text-sm" title={name}>{name}</span>
            {(typeof details === "string" ? [details] : details).map((line, index) => (
                <span key={index} className="truncate text-xs text-muted-foreground" title={line}>
                    {line}
                </span>
            ))}
        </div>
        {children}
    </div>
)

/** The loading state of a list dialog: announced to screen readers. */
export const ListLoading = () => {
    const { t } = useTranslation()
    return (
        <div role="status" className="flex items-center justify-center gap-2 py-6 text-muted-foreground text-sm">
            <Loader2 className="size-4 animate-spin" /> {t("common.loading")}
        </div>
    )
}

/** The failed load of a list dialog: the error with a way to try again (instead of a misleading "empty" message). */
export const ListError = ({ message, onRetry }: { message: string, onRetry: () => void }) => {
    const { t } = useTranslation()
    return (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p role="alert" className="text-sm text-destructive break-words">{message}</p>
            <Button variant="outline" size="sm" onClick={onRetry}>{t("common.retry")}</Button>
        </div>
    )
}

type TypeTabsProps<T extends keyof typeof ITEM_ICONS> = {
    types: readonly T[]
    active: T
    onSelect: (type: T) => void
    count: (type: T) => number
    label: (type: T) => string
    ariaLabel: string
    /** The content of the selected tab (the panel). */
    children: ReactNode
}

/** Vertical tabs of the trash / archive dialogs: one per kind of item, with its count, and the panel of the selected one. Arrows move between the tabs. */
export function TypeTabs<T extends keyof typeof ITEM_ICONS>({ types, active, onSelect, count, label, ariaLabel, children }: TypeTabsProps<T>) {
    return (
        <Tabs
            orientation="vertical"
            value={active}
            onValueChange={value => onSelect(value as T)}
            className="flex-col sm:flex-row gap-4 min-h-0 flex-1"
        >
            <TabsList
                variant="line"
                aria-label={ariaLabel}
                className="w-full sm:w-48 shrink-0 max-sm:flex-row max-sm:overflow-x-auto sm:h-fit sm:justify-start sm:self-start gap-1 p-0 pb-2 sm:pb-0 sm:pr-3 border-b sm:border-b-0 sm:border-r"
            >
                {types.map(type => {
                    const TypeIcon: LucideIcon = ITEM_ICONS[type]
                    return (
                        <TabsTrigger
                            key={type}
                            value={type}
                            data-type={type}
                            className="flex-none sm:flex-1 justify-start px-3 py-2 data-[state=active]:font-medium data-[state=active]:bg-accent"
                        >
                            <TypeIcon />
                            {label(type)}
                            <span className="ml-auto text-xs text-muted-foreground">{count(type)}</span>
                        </TabsTrigger>
                    )
                })}
            </TabsList>
            <TabsContent value={active} className="min-w-0 overflow-y-auto pr-1 flex flex-col gap-1">
                {children}
            </TabsContent>
        </Tabs>
    )
}
