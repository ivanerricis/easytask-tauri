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

export const SettingsPanel = ({ title, children }: { title: string, children: ReactNode }) => (
    <section className="flex flex-col gap-4">
        <h2 className="text-base font-semibold">{title}</h2>
        {children}
    </section>
)
