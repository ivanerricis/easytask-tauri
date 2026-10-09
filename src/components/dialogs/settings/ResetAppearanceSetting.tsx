import { useState } from "react"
import { useTranslation } from "react-i18next"
import { RotateCcw } from "lucide-react"
import { ConfirmDialog } from "../dialog-confirm"
import { useTheme } from "@/components/use-theme"
import { usePreferences } from "@/contexts/use-preferences"
import { DEFAULT_LANGUAGE_PREFERENCE } from "@/i18n"
import { DEFAULT_COLOR_INTENSITY } from "@/lib/color-intensity"
import { DEFAULT_ANIMATION_SPEED, DEFAULT_PRIMARY_COLOR } from "@/lib/store/preferences"
import { SectionResetButton } from "./SectionResetButton"

/**
 * "Ripristina tutto" of the Appearance page (the `action` of its panel): puts every control of the Appearance page back to its default (theme, accent color, language,
 * size of folders and notes, color intensity, speed of the animations). It asks for confirmation, and it is disabled while everything is already default.
 */
export const ResetAppearanceSetting = () => {
    const { t } = useTranslation()
    const { theme, setTheme } = useTheme()
    const {
        primaryColor, setPrimaryColor,
        language, setLanguage,
        sidebarItemSize, setSidebarItemSize,
        colorIntensity, setColorIntensity,
        animationSpeed, setAnimationSpeed,
    } = usePreferences()
    const [open, setOpen] = useState(false)

    const isDefault = theme === "system"
        && primaryColor.toLowerCase() === DEFAULT_PRIMARY_COLOR
        && language === DEFAULT_LANGUAGE_PREFERENCE
        && sidebarItemSize === "normal"
        && colorIntensity === DEFAULT_COLOR_INTENSITY
        && animationSpeed === DEFAULT_ANIMATION_SPEED

    const handleReset = () => {
        setTheme("system")
        setPrimaryColor(DEFAULT_PRIMARY_COLOR)
        setLanguage(DEFAULT_LANGUAGE_PREFERENCE)
        setSidebarItemSize("normal")
        setColorIntensity(DEFAULT_COLOR_INTENSITY)
        setAnimationSpeed(DEFAULT_ANIMATION_SPEED)
    }

    return (
        <>
            <SectionResetButton disabled={isDefault} title={t("settings.appearance.reset.description")} onClick={() => setOpen(true)} />
            <ConfirmDialog
                open={open}
                onOpenChange={setOpen}
                title={t("settings.appearance.reset.confirmTitle")}
                description={t("settings.appearance.reset.confirmDescription")}
                confirm={{ label: t("settings.appearance.reset.confirm"), icon: RotateCcw, onClick: handleReset }}
            />
        </>
    )
}
