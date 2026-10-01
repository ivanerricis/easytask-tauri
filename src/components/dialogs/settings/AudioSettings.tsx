import { useTranslation } from "react-i18next"
import { RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePreferences } from "@/contexts/use-preferences"
import { SettingsPanel, SettingsRow } from "./SettingsRow"

export const AudioSettings = () => {
    const { t } = useTranslation()
    const { resetPlayerPosition } = usePreferences()

    return (
        <SettingsPanel title={t("settings.audio.title")}>
            <SettingsRow label={t("settings.audio.resetPlayer.label")} description={t("settings.audio.resetPlayer.description")}>
                <Button variant="outline" size="sm" onClick={resetPlayerPosition}>
                    <RotateCcw />
                    {t("settings.audio.resetPlayer.button")}
                </Button>
            </SettingsRow>
        </SettingsPanel>
    )
}
