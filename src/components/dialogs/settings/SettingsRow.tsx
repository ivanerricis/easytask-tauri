import { useId, type ReactNode } from "react"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { HIDE_WHEN_NO_ROWS, SettingsSearchContext, matchesSearch, useSettingsSearch } from "./settings-search-context"

/** Ids a control of a {@link SettingsRow} uses to be named and described by the row. */
export type SettingsControlProps = {
    /** `id` of the control (the label points to it). */
    id: string
    /** Id of the label, for controls that cannot be the target of a `<label>` (groups, sliders). */
    labelId: string
    /** Id of the description (undefined without one), for `aria-describedby`. */
    descriptionId: string | undefined
}

type SettingsRowProps = {
    label: string
    description?: string
    /** The control; as a function it receives the ids that tie it to the label and the description. */
    children: ReactNode | ((props: SettingsControlProps) => ReactNode)
    /** Row-level reset (a RowResetButton), rendered before the control only when the value differs from the default. */
    reset?: ReactNode
}

export const SettingsRow = ({ label, description, children, reset }: SettingsRowProps) => {
    const base = useId()
    const { query, scopeMatches } = useSettingsSearch()
    // While searching, a row shows only when it (or its panel / subsection title) matches
    if (query && !scopeMatches && !matchesSearch(query, label, description)) return null
    const ids: SettingsControlProps = { id: `${base}-control`, labelId: `${base}-label`, descriptionId: description ? `${base}-description` : undefined }
    return (
        <div data-settings-row className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 w-full">
            {/* Below ~12rem the control drops under the text instead of squeezing it (narrow window, big app zoom) */}
            <div className="min-w-48 flex-1">
                <Label id={ids.labelId} htmlFor={ids.id} className="font-normal">{label}</Label>
                {description && (
                    <p id={ids.descriptionId} className="text-xs text-muted-foreground">{description}</p>
                )}
            </div>
            <div className="shrink-0 flex items-center gap-2">
                {/* The reset button comes before the control, so the controls end at the right edge of every row */}
                {reset}
                {typeof children === "function" ? children(ids) : children}
            </div>
        </div>
    )
}

type SettingsSwitchRowProps = {
    label: string
    description?: string
    checked: boolean
    onCheckedChange: (checked: boolean) => void
    disabled?: boolean
}

/** A row with a switch: the label names the switch and the description is announced with it. */
export const SettingsSwitchRow = ({ label, description, checked, onCheckedChange, disabled }: SettingsSwitchRowProps) => (
    <SettingsRow label={label} description={description}>
        {({ id, descriptionId }) => (
            <Switch id={id} aria-describedby={descriptionId} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
        )}
    </SettingsRow>
)

type SettingsPanelProps = {
    title: string
    /** Section-level action (e.g. the reset of the whole section): always in the title row, on the right. */
    action?: ReactNode
    children: ReactNode
}

/** Provides the search to the rows inside a titled container: all of them show when the title matches. */
const TitleScope = ({ title, children }: { title: string, children: ReactNode }) => {
    const search = useSettingsSearch()
    const scopeMatches = search.scopeMatches || (search.query !== "" && matchesSearch(search.query, title))
    return <SettingsSearchContext.Provider value={{ query: search.query, scopeMatches }}>{children}</SettingsSearchContext.Provider>
}

export const SettingsPanel = ({ title, action, children }: SettingsPanelProps) => {
    const { query } = useSettingsSearch()
    return (
        <TitleScope title={title}>
            <section className={cn("flex flex-col gap-6", query && HIDE_WHEN_NO_ROWS)}>
                {/* pr-8: the close button (X) of the dialog sits in the top right corner, the action stays on its left */}
                <div className="flex items-center justify-between gap-3 min-h-8 pr-8">
                    <h3 className="text-base font-semibold">{title}</h3>
                    {action}
                </div>
                {children}
            </section>
        </TitleScope>
    )
}

/**
 * Card holding the rows of a panel, one under the other with a line between them. Every direct child is a row
 * (it gets the padding of the card), so wrap together what must stay in a single row.
 */
export const SettingsCard = ({ children }: { children: ReactNode }) => {
    const { query } = useSettingsSearch()
    return (
        <div className={cn(
            "flex flex-col divide-y rounded-xs border bg-card [&>*]:px-4 [&>*]:py-3",
            // While searching only the rows stay (the other children are info, lists, hints); the empty card goes away
            query && `${HIDE_WHEN_NO_ROWS} divide-y-0 [&>*+*]:border-t [&>*:not([data-settings-row]):not(:has([data-settings-row]))]:hidden`,
        )}>
            {children}
        </div>
    )
}

/** Titled group of rows inside a panel: the title, then the rows in a {@link SettingsCard}. */
export const SettingsSubsection = ({ title, children }: { title: string, children: ReactNode }) => {
    const { query } = useSettingsSearch()
    return (
        <TitleScope title={title}>
            <section aria-label={title} className={cn("flex flex-col gap-2", query && HIDE_WHEN_NO_ROWS)}>
                <h4 className="text-sm font-semibold">{title}</h4>
                <SettingsCard>{children}</SettingsCard>
            </section>
        </TitleScope>
    )
}
