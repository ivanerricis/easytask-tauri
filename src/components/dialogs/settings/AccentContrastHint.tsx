import { useTranslation } from "react-i18next"
import { TriangleAlert } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/use-theme"
import { usePreferences } from "@/contexts/use-preferences"
import { ACCENT_MIN_CONTRAST, accentContrast, applyAccentColor, suggestAccentColor, type AccentTheme } from "@/lib/accent-color"

/** The theme actually shown ("system" follows the operating system). */
const resolveTheme = (theme: "light" | "dark" | "system"): AccentTheme =>
    theme === "system" ? (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light") : theme

const format = (ratio: number) => ratio.toFixed(1)

/**
 * Warns when the accent color has too little contrast with the background of the current theme (borders, selections and focus
 * rings would be hard to see) and offers the closest color that has enough. Nothing is shown for a good color.
 */
export const AccentContrastHint = () => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { primaryColor, setPrimaryColor } = usePreferences()
    const shownTheme = resolveTheme(theme)
    const ratio = accentContrast(primaryColor, shownTheme)
    const suggestion = suggestAccentColor(primaryColor, shownTheme)
    if (ratio === null || suggestion === null) return null

    const handleUse = () => {
        applyAccentColor(suggestion)
        setPrimaryColor(suggestion)
    }

    return (
        <Alert role="status" className="border-amber-500/50">
            <TriangleAlert />
            <AlertDescription className="flex flex-col gap-2">
                <p>
                    {t(`settings.appearance.accent.contrast.warning.${shownTheme}`, { ratio: format(ratio), min: ACCENT_MIN_CONTRAST })}
                </p>
                <Button type="button" variant="outline" size="sm" className="self-start" onClick={handleUse}>
                    <span aria-hidden className="size-4 rounded-xs border" style={{ backgroundColor: suggestion }} />
                    {t("settings.appearance.accent.contrast.use", { color: suggestion.toUpperCase(), ratio: format(accentContrast(suggestion, shownTheme) ?? 0) })}
                </Button>
            </AlertDescription>
        </Alert>
    )
}
