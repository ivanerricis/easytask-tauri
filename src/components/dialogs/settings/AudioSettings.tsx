import { useTranslation } from "react-i18next"
import { RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { usePreferences } from "@/contexts/use-preferences"
import { AUDIO_PLAYER_SCALES, MIN_AUDIO_PLAYER_OPACITY, type AudioPlayerScale } from "@/lib/store/preferences"
import { SettingsPanel, SettingsRow } from "./SettingsRow"
import { SectionResetButton } from "./SectionResetButton"
import { rangeStyle } from "@/lib/range"

const SIZE_KEYS: Record<AudioPlayerScale, "small" | "normal" | "large"> = { 0.85: "small", 1: "normal", 1.2: "large" }

const PercentRange = ({ label, value, min, onChange }: { label: string, value: number, min: number, onChange: (value: number) => void }) => {
    const percent = Math.round(value * 100)
    return (
        <div className="flex items-center gap-2">
            <input
                type="range"
                min={min * 100}
                max={100}
                step={1}
                value={percent}
                onChange={e => onChange(Number(e.target.value) / 100)}
                aria-label={label}
                aria-valuetext={`${percent}%`}
                style={rangeStyle(percent, min * 100, 100)}
                className="w-32 accent-primary cursor-pointer"
            />
            <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">{percent}%</span>
        </div>
    )
}

export const AudioSettings = () => {
    const { t } = useTranslation()
    const {
        resetPlayerPosition, resetAudioSettings,
        audioVolume, setAudioVolume,
        audioPlayerVisible, setAudioPlayerVisible,
        audioPlayerScale, setAudioPlayerScale,
        audioPlayerOpacity, setAudioPlayerOpacity,
    } = usePreferences()
    const sizeLabel = t("settings.audio.playerSize.label")

    return (
        <SettingsPanel
            title={t("settings.audio.title")}
            action={<SectionResetButton title={t("settings.audio.resetAll.description")} onClick={resetAudioSettings} />}
        >
            <SettingsRow label={t("settings.audio.volume.label")} description={t("settings.audio.volume.description")}>
                <PercentRange label={t("settings.audio.volume.label")} value={audioVolume} min={0} onChange={setAudioVolume} />
            </SettingsRow>
            <SettingsRow label={t("settings.audio.playerVisible.label")} description={t("settings.audio.playerVisible.description")}>
                <Switch
                    aria-label={t("settings.audio.playerVisible.label")}
                    checked={audioPlayerVisible}
                    onCheckedChange={setAudioPlayerVisible}
                />
            </SettingsRow>
            <SettingsRow label={sizeLabel} description={t("settings.audio.playerSize.description")}>
                <div role="radiogroup" aria-label={sizeLabel} className="flex rounded-xs border p-0.5 gap-0.5">
                    {AUDIO_PLAYER_SCALES.map(value => (
                        <button
                            key={value}
                            type="button"
                            role="radio"
                            aria-checked={audioPlayerScale === value}
                            onClick={() => setAudioPlayerScale(value)}
                            className={`px-2 py-1 text-xs rounded-xs cursor-pointer ${audioPlayerScale === value ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                        >
                            {t(`settings.audio.playerSize.${SIZE_KEYS[value]}`)}
                        </button>
                    ))}
                </div>
            </SettingsRow>
            <SettingsRow label={t("settings.audio.playerOpacity.label")} description={t("settings.audio.playerOpacity.description")}>
                <PercentRange label={t("settings.audio.playerOpacity.label")} value={audioPlayerOpacity} min={MIN_AUDIO_PLAYER_OPACITY} onChange={setAudioPlayerOpacity} />
            </SettingsRow>
            <SettingsRow label={t("settings.audio.resetPlayer.label")} description={t("settings.audio.resetPlayer.description")}>
                <Button variant="outline" size="sm" onClick={resetPlayerPosition}>
                    <RotateCcw />
                    {t("settings.audio.resetPlayer.button")}
                </Button>
            </SettingsRow>
        </SettingsPanel>
    )
}
