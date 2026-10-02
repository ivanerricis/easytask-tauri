import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useTheme } from "@/components/use-theme"
import { usePreferences } from "@/contexts/use-preferences"
import { DEFAULT_LANGUAGE_PREFERENCE } from "@/i18n"
import { DEFAULT_COLOR_INTENSITY } from "@/lib/color-intensity"
import { DEFAULT_PRIMARY_COLOR } from "@/lib/store/preferences"
import { SectionResetButton } from "./SectionResetButton"

/**
 * "Ripristina tutto" of the Appearance page (the `action` of its panel): puts every control of the Appearance page back to its default (theme, accent color, language,
 * size of folders and notes, color intensity). It asks for confirmation, and it is disabled while everything is already default.
 */
export const ResetAppearanceSetting = () => {
    const { t } = useTranslation()
    const { theme, setTheme } = useTheme()
    const {
        primaryColor, setPrimaryColor,
        language, setLanguage,
        sidebarItemSize, setSidebarItemSize,
        colorIntensity, setColorIntensity,
    } = usePreferences()
    const [open, setOpen] = useState(false)

    const isDefault = theme === "system"
        && primaryColor.toLowerCase() === DEFAULT_PRIMARY_COLOR
        && language === DEFAULT_LANGUAGE_PREFERENCE
        && sidebarItemSize === "normal"
        && colorIntensity === DEFAULT_COLOR_INTENSITY

    const handleReset = () => {
        setTheme("system")
        setPrimaryColor(DEFAULT_PRIMARY_COLOR)
        setLanguage(DEFAULT_LANGUAGE_PREFERENCE)
        setSidebarItemSize("normal")
        setColorIntensity(DEFAULT_COLOR_INTENSITY)
        setOpen(false)
    }

    return (
        <>
            <SectionResetButton disabled={isDefault} title={t("settings.appearance.reset.description")} onClick={() => setOpen(true)} />
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t("settings.appearance.reset.confirmTitle")}</DialogTitle>
                        <DialogDescription>{t("settings.appearance.reset.confirmDescription")}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
                        <Button onClick={handleReset}>{t("settings.appearance.reset.confirm")}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
