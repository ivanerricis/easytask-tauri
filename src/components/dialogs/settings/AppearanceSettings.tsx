import { useTranslation } from "react-i18next"
import { ModeToggle } from "@/components/mode-toggle"
import { Input } from "@/components/ui/input"
import { usePreferences } from "@/contexts/use-preferences"
import { SettingsPanel, SettingsRow } from "./SettingsRow"
import { LanguageSetting } from "./LanguageSetting"
import { SidebarItemSizeSetting } from "./SidebarItemSizeSetting"
import { ColorIntensitySetting } from "./ColorIntensitySetting"

export const AppearanceSettings = () => {
    const { t } = useTranslation()
    const { primaryColor, setPrimaryColor } = usePreferences()

    return (
        <SettingsPanel title={t("settings.appearance.title")}>
            <SettingsRow label={t("settings.appearance.theme.label")} description={t("settings.appearance.theme.description")}>
                <ModeToggle />
            </SettingsRow>
            <SettingsRow label={t("settings.appearance.accent.label")} description={t("settings.appearance.accent.description")}>
                <div
                    className="flex items-center justify-center size-5 border rounded-xs"
                    style={{ backgroundColor: primaryColor }}
                >
                    <Input
                        type="color"
                        aria-label={t("settings.appearance.accent.label")}
                        className="opacity-0 cursor-pointer"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                    />
                </div>
            </SettingsRow>
            <LanguageSetting />
            <SidebarItemSizeSetting />
            <ColorIntensitySetting />
        </SettingsPanel>
    )
}
