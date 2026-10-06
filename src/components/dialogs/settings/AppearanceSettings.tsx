import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { ModeToggle } from "@/components/mode-toggle"
import { Input } from "@/components/ui/input"
import { usePreferences } from "@/contexts/use-preferences"
import { RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TooltipCustom } from "@/components/tooltip-custom"
import { DEFAULT_PRIMARY_COLOR, applyAccentColor } from "@/lib/accent-color"
import { SettingsPanel, SettingsRow } from "./SettingsRow"
import { LanguageSetting } from "./LanguageSetting"
import { SidebarItemSizeSetting } from "./SidebarItemSizeSetting"
import { ColorIntensitySetting } from "./ColorIntensitySetting"
import { ResetAppearanceSetting } from "./ResetAppearanceSetting"

/** Quiet time after the last change of the color picker before the color is stored. */
const ACCENT_COMMIT_DELAY_MS = 250

/**
 * The accent color picker. While the color is dragged the native picker fires dozens of changes per second: each one
 * only previews the color on the page (a CSS variable), while the preference (which re-renders everything that reads
 * the preferences, and is saved) is set once, when the picker rests. Closing the dialog commits a pending color.
 */
const AccentColorPicker = ({ label, resetLabel }: { label: string, resetLabel: string }) => {
    const { primaryColor, setPrimaryColor } = usePreferences()
    // The color being previewed; null when the picker just shows the stored preference (which a reset can change)
    const [draft, setDraft] = useState<string | null>(null)
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const pending = useRef<string | null>(null)
    const commit = useRef(setPrimaryColor)
    useEffect(() => { commit.current = setPrimaryColor })

    const flush = useCallback(() => {
        if (timer.current) clearTimeout(timer.current)
        timer.current = null
        const hex = pending.current
        pending.current = null
        if (hex === null) return
        commit.current(hex)
        setDraft(null)
    }, [])
    useEffect(() => flush, [flush])

    const handleChange = (hex: string) => {
        setDraft(hex)
        applyAccentColor(hex)
        pending.current = hex
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(flush, ACCENT_COMMIT_DELAY_MS)
    }

    // Back to the default color at once: a pending change is dropped
    const handleReset = () => {
        if (timer.current) clearTimeout(timer.current)
        timer.current = null
        pending.current = null
        setDraft(null)
        applyAccentColor(DEFAULT_PRIMARY_COLOR)
        commit.current(DEFAULT_PRIMARY_COLOR)
    }

    const shown = draft ?? primaryColor
    const isDefault = shown.toLowerCase() === DEFAULT_PRIMARY_COLOR

    return (
        <div className="flex items-center gap-2">
            <TooltipCustom text={resetLabel}>
                <Button variant="ghost" size="icon" className="size-6 [&_svg]:!size-4" aria-label={resetLabel} disabled={isDefault} onClick={handleReset}>
                    <RotateCcw />
                </Button>
            </TooltipCustom>
            <div
                className="flex items-center justify-center size-5 border rounded-xs"
                style={{ backgroundColor: shown }}
            >
                <Input
                    type="color"
                    aria-label={label}
                    className="opacity-0 cursor-pointer"
                    value={shown}
                    onChange={(e) => handleChange(e.target.value)}
                />
            </div>
        </div>
    )
}

export const AppearanceSettings = () => {
    const { t } = useTranslation()
    return (
        <SettingsPanel title={t("settings.appearance.title")} action={<ResetAppearanceSetting />}>
            <SettingsRow label={t("settings.appearance.theme.label")} description={t("settings.appearance.theme.description")}>
                <ModeToggle />
            </SettingsRow>
            <SettingsRow label={t("settings.appearance.accent.label")} description={t("settings.appearance.accent.description")}>
                <AccentColorPicker label={t("settings.appearance.accent.label")} resetLabel={t("settings.appearance.accent.reset")} />
            </SettingsRow>
            <LanguageSetting />
            <SidebarItemSizeSetting />
            <ColorIntensitySetting />
        </SettingsPanel>
    )
}
