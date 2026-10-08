import { useTranslation } from "react-i18next"
import { RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { usePreferences } from "@/contexts/use-preferences"
import { AUDIO_PLAYER_SCALES, MIN_AUDIO_PLAYER_OPACITY, type AudioPlayerScale } from "@/lib/store/preferences"
import { SettingsPanel, SettingsRow, SettingsSwitchRow } from "./SettingsRow"
import { SegmentedSetting } from "./SegmentedSetting"
import { SectionResetButton } from "./SectionResetButton"

const SIZE_KEYS: Record<AudioPlayerScale, "small" | "normal" | "large"> = { 0.85: "small", 1: "normal", 1.2: "large" }

const PercentRange = ({ label, value, min, onChange }: { label: string, value: number, min: number, onChange: (value: number) => void }) => {
    const percent = Math.round(value * 100)
    return (
        <div className="flex items-center gap-2">
            <Slider
                min={min * 100}
                max={100}
                step={1}
                value={[percent]}
                onValueChange={([next]) => onChange(next / 100)}
                aria-label={label}
                aria-valuetext={`${percent}%`}
                className="w-32"
            />
            <span aria-hidden className="w-10 text-right text-xs text-muted-foreground tabular-nums">{percent}%</span>
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

    return (
        <SettingsPanel
            title={t("settings.audio.title")}
            action={<SectionResetButton title={t("settings.audio.resetAll.description")} onClick={resetAudioSettings} />}
        >
            <SettingsRow label={t("settings.audio.volume.label")} description={t("settings.audio.volume.description")}>
                <PercentRange label={t("settings.audio.volume.label")} value={audioVolume} min={0} onChange={setAudioVolume} />
            </SettingsRow>
            <SettingsSwitchRow
                label={t("settings.audio.playerVisible.label")}
                description={t("settings.audio.playerVisible.description")}
                checked={audioPlayerVisible}
                onCheckedChange={setAudioPlayerVisible}
            />
            <SegmentedSetting
                label={t("settings.audio.playerSize.label")}
                description={t("settings.audio.playerSize.description")}
                value={String(audioPlayerScale)}
                options={AUDIO_PLAYER_SCALES.map(value => ({ value: String(value), label: t(`settings.audio.playerSize.${SIZE_KEYS[value]}`) }))}
                onChange={value => setAudioPlayerScale(Number(value) as AudioPlayerScale)}
            />
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
