import { useId, type ReactNode } from "react"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"

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
}

export const SettingsRow = ({ label, description, children }: SettingsRowProps) => {
    const base = useId()
    const ids: SettingsControlProps = { id: `${base}-control`, labelId: `${base}-label`, descriptionId: description ? `${base}-description` : undefined }
    return (
        <div className="flex items-center justify-between gap-4 w-full">
            <div className="min-w-0">
                <Label id={ids.labelId} htmlFor={ids.id} className="font-normal">{label}</Label>
                {description && (
                    <p id={ids.descriptionId} className="text-xs text-muted-foreground">{description}</p>
                )}
            </div>
            <div className="shrink-0">{typeof children === "function" ? children(ids) : children}</div>
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

export const SettingsPanel = ({ title, action, children }: SettingsPanelProps) => (
    <section className="flex flex-col gap-4">
        {/* pr-8: the close button (X) of the dialog sits in the top right corner, the action stays on its left */}
        <div className="flex items-center justify-between gap-3 min-h-8 pr-8">
            <h3 className="text-base font-semibold">{title}</h3>
            {action}
        </div>
        {children}
    </section>
)

/** Titled group of rows inside a panel, set apart from what precedes it by a separator. */
export const SettingsSubsection = ({ title, children }: { title: string, children: ReactNode }) => (
    <>
        <Separator />
        <section aria-label={title} className="flex flex-col gap-3">
            <h4 className="text-sm font-semibold">{title}</h4>
            {children}
        </section>
    </>
)
