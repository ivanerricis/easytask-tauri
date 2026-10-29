import { useTranslation } from "react-i18next"
import { SelectItem } from "@/components/ui/select"
import { usePreferences } from "@/contexts/use-preferences"
import type { LanguagePreference } from "@/i18n"
import { SettingsSelectRow } from "./SettingsRow"

const VALUES: LanguagePreference[] = ["system", "it", "en"]

/** The language of the interface, in a menu so more languages can be added without crowding the row. */
export const LanguageSetting = () => {
    const { t } = useTranslation()
    const { language, setLanguage } = usePreferences()

    return (
        <SettingsSelectRow
            label={t("settings.appearance.language.label")}
            description={t("settings.appearance.language.description")}
            value={language}
            onValueChange={value => setLanguage(value as LanguagePreference)}
            width="w-40"
        >
            {VALUES.map(value => (
                <SelectItem key={value} value={value}>{t(`settings.appearance.language.options.${value}`)}</SelectItem>
            ))}
        </SettingsSelectRow>
    )
}
