import { forwardRef } from "react"
import { Search, X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type SettingsSearchFieldProps = {
    value: string
    onChange: (value: string) => void
}

/** The search field of the settings dialog; Escape is handled by the dialog, which must not close while there is a query. */
export const SettingsSearchField = forwardRef<HTMLInputElement, SettingsSearchFieldProps>(({ value, onChange }, ref) => {
    const { t } = useTranslation()
    return (
        <div className="relative">
            <Search aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
                ref={ref}
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                aria-label={t("settings.search.label")}
                placeholder={t("settings.search.placeholder")}
                autoComplete="off"
                spellCheck={false}
                // The clear button takes the right padding only while it is shown
                className={cn("h-8 pl-8 text-sm", value ? "pr-8" : "pr-2")}
            />
            {value && (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t("settings.search.clear")}
                    onClick={() => onChange("")}
                    className="absolute right-1 top-1/2 size-6 -translate-y-1/2 [&_svg]:!size-3.5"
                >
                    <X />
                </Button>
            )}
        </div>
    )
})
SettingsSearchField.displayName = "SettingsSearchField"
