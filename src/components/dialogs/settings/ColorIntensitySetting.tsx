import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Slider } from "@/components/ui/slider"
import { usePreferences } from "@/contexts/use-preferences"
import {
    COLOR_ALPHA_BASE,
    COLOR_INTENSITY_STEP,
    DEFAULT_COLOR_INTENSITY,
    MAX_COLOR_INTENSITY,
    MIN_COLOR_INTENSITY,
    scaleAlpha,
} from "@/lib/color-intensity"
import { hexToRgba } from "@/lib/utils"
import { SettingsRow } from "./SettingsRow"
import { RowResetButton } from "./RowResetButton"

const SAMPLE_COLORS = ["#ef4444", "#3b82f6", "#22c55e"]

export const ColorIntensitySetting = () => {
    const { t } = useTranslation()
    const { colorIntensity, setColorIntensity } = usePreferences()
    const label = t("settings.appearance.colorIntensity.label")
    // The value shown while the thumb is dragged: the preference (saved, and read by the whole app) is set on release
    const [draft, setDraft] = useState<number | null>(null)
    const shown = draft ?? colorIntensity
    const percent = Math.round(shown * 100)
    const alpha = scaleAlpha(COLOR_ALPHA_BASE.item, shown)

    return (
        <div className="flex flex-col gap-3">
            <SettingsRow
                label={label}
                description={t("settings.appearance.colorIntensity.description")}
                reset={colorIntensity === DEFAULT_COLOR_INTENSITY
                    ? undefined
                    : <RowResetButton label={t("settings.appearance.colorIntensity.reset")} onClick={() => setColorIntensity(DEFAULT_COLOR_INTENSITY)} />}
            >
                <div className="flex items-center gap-2">
                    <Slider
                        min={Math.round(MIN_COLOR_INTENSITY * 100)}
                        max={Math.round(MAX_COLOR_INTENSITY * 100)}
                        step={Math.round(COLOR_INTENSITY_STEP * 100)}
                        value={[percent]}
                        deferChange
                        onValueDrag={([next]) => setDraft(next / 100)}
                        onValueChange={([next]) => setColorIntensity(next / 100)}
                        onValueCommit={() => setDraft(null)}
                        aria-label={label}
                        aria-valuetext={`${percent}%`}
                        className="w-32"
                    />
                    <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">{percent}%</span>
                </div>
            </SettingsRow>
            {/* Under the slider: w-44 = slider (w-32) + gap + value (w-10); mr-10 = the reset slot (size-8) + gap, as in SettingsRow */}
            <div aria-hidden className="w-44 self-end mr-10 flex flex-col gap-1">
                <div className="flex gap-1" data-testid="color-intensity-preview">
                    {SAMPLE_COLORS.map(color => (
                        <div
                            key={color}
                            className="h-6 flex-1 rounded-xs border border-accent"
                            style={{ backgroundColor: hexToRgba(alpha, color) }}
                        />
                    ))}
                </div>
                <span className="text-xs text-muted-foreground">{t("settings.appearance.colorIntensity.preview")}</span>
            </div>
        </div>
    )
}
