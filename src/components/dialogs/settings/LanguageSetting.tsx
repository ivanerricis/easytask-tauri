import { useTranslation } from "react-i18next"
import { usePreferences } from "@/contexts/use-preferences"
import type { LanguagePreference } from "@/i18n"
import { SegmentedSetting } from "./SegmentedSetting"

const VALUES: LanguagePreference[] = ["system", "it", "en"]

export const LanguageSetting = () => {
    const { t } = useTranslation()
    const { language, setLanguage } = usePreferences()

    return (
        <SegmentedSetting
            label={t("settings.appearance.language.label")}
            description={t("settings.appearance.language.description")}
            value={language}
            options={VALUES.map(value => ({ value, label: t(`settings.appearance.language.options.${value}`) }))}
            onChange={setLanguage}
        />
    )
}
