import type { ReactNode } from "react"

type SettingsRowProps = {
    label: string
    description?: string
    children: ReactNode
}

export const SettingsRow = ({ label, description, children }: SettingsRowProps) => (
    <div className="flex items-center justify-between gap-4 w-full">
        <div className="min-w-0">
            <div className="text-sm">{label}</div>
            {description && (
                <p className="text-xs text-muted-foreground">{description}</p>
            )}
        </div>
        <div className="shrink-0">{children}</div>
    </div>
)

type SettingsPanelProps = {
    title: string
    /** Section-level action (e.g. the reset of the whole section): always in the title row, on the right. */
    action?: ReactNode
    children: ReactNode
}

export const SettingsPanel = ({ title, action, children }: SettingsPanelProps) => (
    <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3 min-h-8">
            <h3 className="text-base font-semibold">{title}</h3>
            {action}
        </div>
        {children}
    </section>
)
