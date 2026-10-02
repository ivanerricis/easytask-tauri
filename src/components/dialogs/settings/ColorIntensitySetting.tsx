import { useTranslation } from "react-i18next"
import { RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
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
import { rangeStyle } from "@/lib/range"
import { SettingsRow } from "./SettingsRow"

const SAMPLE_COLORS = ["#ef4444", "#3b82f6", "#22c55e"]

export const ColorIntensitySetting = () => {
    const { t } = useTranslation()
    const { colorIntensity, setColorIntensity } = usePreferences()
    const label = t("settings.appearance.colorIntensity.label")
    const percent = Math.round(colorIntensity * 100)
    const alpha = scaleAlpha(COLOR_ALPHA_BASE.item, colorIntensity)

    return (
        <div className="flex flex-col gap-3">
            <SettingsRow label={label} description={t("settings.appearance.colorIntensity.description")}>
                <div className="flex items-center gap-2">
                    <input
                        type="range"
                        min={MIN_COLOR_INTENSITY * 100}
                        max={MAX_COLOR_INTENSITY * 100}
                        step={COLOR_INTENSITY_STEP * 100}
                        value={percent}
                        onChange={e => setColorIntensity(Number(e.target.value) / 100)}
                        aria-label={label}
                        aria-valuetext={`${percent}%`}
                        style={rangeStyle(percent, MIN_COLOR_INTENSITY * 100, MAX_COLOR_INTENSITY * 100)}
                        className="w-32 accent-primary cursor-pointer"
                    />
                    <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">{percent}%</span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setColorIntensity(DEFAULT_COLOR_INTENSITY)}
                        disabled={colorIntensity === DEFAULT_COLOR_INTENSITY}
                    >
                        <RotateCcw />
                        {t("settings.appearance.colorIntensity.reset")}
                    </Button>
                </div>
            </SettingsRow>
            <div aria-hidden className="flex gap-1 self-start" data-testid="color-intensity-preview">
                {SAMPLE_COLORS.map(color => (
                    <div
                        key={color}
                        className="w-20 h-6 rounded-xs border border-accent"
                        style={{ backgroundColor: hexToRgba(alpha, color) }}
                    />
                ))}
            </div>
        </div>
    )
}
