import { useTranslation } from "react-i18next"
import { usePreferences } from "@/contexts/use-preferences"
import type { LanguagePreference } from "@/i18n"
import { SettingsRow } from "./SettingsRow"

const VALUES: LanguagePreference[] = ["system", "it", "en"]

export const LanguageSetting = () => {
    const { t } = useTranslation()
    const { language, setLanguage } = usePreferences()
    const label = t("settings.appearance.language.label")

    return (
        <SettingsRow label={label} description={t("settings.appearance.language.description")}>
            <div role="radiogroup" aria-label={label} className="flex rounded-xs border p-0.5 gap-0.5">
                {VALUES.map(value => (
                    <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={language === value}
                        onClick={() => setLanguage(value)}
                        className={`px-2 py-1 text-xs rounded-xs cursor-pointer ${language === value ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                    >
                        {t(`settings.appearance.language.options.${value}`)}
                    </button>
                ))}
            </div>
        </SettingsRow>
    )
}
