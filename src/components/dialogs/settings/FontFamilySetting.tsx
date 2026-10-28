import { useTranslation } from "react-i18next"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { usePreferences } from "@/contexts/use-preferences"
import { FONT_FAMILIES, type FontFamily } from "@/lib/store/preferences"
import { SettingsRow } from "./SettingsRow"

/** The font of the whole app: the system one or one of the fonts bundled with the app. */
export const FontFamilySetting = () => {
    const { t } = useTranslation()
    const { fontFamily, setFontFamily } = usePreferences()

    return (
        <SettingsRow label={t("settings.appearance.fontFamily.label")} description={t("settings.appearance.fontFamily.description")}>
            {({ id, descriptionId }) => (
                <Select value={fontFamily} onValueChange={value => setFontFamily(value as FontFamily)}>
                    <SelectTrigger id={id} aria-describedby={descriptionId} size="sm" className="w-56">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {FONT_FAMILIES.map(value => (
                            <SelectItem key={value} value={value}>{t(`settings.appearance.fontFamily.options.${value}`)}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
        </SettingsRow>
    )
}
