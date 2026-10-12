import { useTranslation } from "react-i18next"
import { usePreferences } from "@/contexts/use-preferences"
import type { SidebarItemSize } from "@/lib/store/preferences"
import { SegmentedSetting } from "./SegmentedSetting"

const OPTIONS: SidebarItemSize[] = ["compact", "normal", "large"]

export const SidebarItemSizeSetting = () => {
    const { t } = useTranslation()
    const { sidebarItemSize, setSidebarItemSize } = usePreferences()

    return (
        <SegmentedSetting
            label={t("settings.appearance.sidebarSize.label")}
            description={t("settings.appearance.sidebarSize.description")}
            value={sidebarItemSize}
            options={OPTIONS.map(value => ({ value, label: t(`settings.appearance.sidebarSize.${value}`) }))}
            onChange={setSidebarItemSize}
        />
    )
}
