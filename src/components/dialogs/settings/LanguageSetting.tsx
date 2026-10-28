import { useTranslation } from "react-i18next"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { usePreferences } from "@/contexts/use-preferences"
import type { LanguagePreference } from "@/i18n"
import { SettingsRow } from "./SettingsRow"

const VALUES: LanguagePreference[] = ["system", "it", "en"]

/** The language of the interface, in a menu so more languages can be added without crowding the row. */
export const LanguageSetting = () => {
    const { t } = useTranslation()
    const { language, setLanguage } = usePreferences()

    return (
        <SettingsRow label={t("settings.appearance.language.label")} description={t("settings.appearance.language.description")}>
            {({ id, descriptionId }) => (
                <Select value={language} onValueChange={value => setLanguage(value as LanguagePreference)}>
                    <SelectTrigger id={id} aria-describedby={descriptionId} size="sm" className="w-40">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {VALUES.map(value => (
                            <SelectItem key={value} value={value}>{t(`settings.appearance.language.options.${value}`)}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
        </SettingsRow>
    )
}
