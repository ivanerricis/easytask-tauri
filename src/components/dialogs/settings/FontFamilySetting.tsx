import { useTranslation } from "react-i18next"
import { SelectItem } from "@/components/ui/select"
import { usePreferences } from "@/contexts/use-preferences"
import { FONT_FAMILIES, type FontFamily } from "@/lib/store/preferences"
import { SettingsSelectRow } from "./SettingsRow"

/** The font of the whole app: the system one or one of the fonts bundled with the app. */
export const FontFamilySetting = () => {
    const { t } = useTranslation()
    const { fontFamily, setFontFamily } = usePreferences()

    return (
        <SettingsSelectRow
            label={t("settings.appearance.fontFamily.label")}
            description={t("settings.appearance.fontFamily.description")}
            value={fontFamily}
            onValueChange={value => setFontFamily(value as FontFamily)}
            width="w-56"
        >
            {FONT_FAMILIES.map(value => (
                <SelectItem key={value} value={value}>{t(`settings.appearance.fontFamily.options.${value}`)}</SelectItem>
            ))}
        </SettingsSelectRow>
    )
}
