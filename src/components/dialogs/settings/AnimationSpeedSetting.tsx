import { useTranslation } from "react-i18next"
import { usePreferences } from "@/contexts/use-preferences"
import { ANIMATION_SPEEDS } from "@/lib/store/preferences"
import { SegmentedSetting } from "./SegmentedSetting"

export const AnimationSpeedSetting = () => {
    const { t } = useTranslation()
    const { animationSpeed, setAnimationSpeed } = usePreferences()

    return (
        <SegmentedSetting
            label={t("settings.appearance.animations.label")}
            description={t("settings.appearance.animations.description")}
            value={animationSpeed}
            options={ANIMATION_SPEEDS.map(value => ({ value, label: t(`settings.appearance.animations.${value}`) }))}
            onChange={setAnimationSpeed}
        />
    )
}
