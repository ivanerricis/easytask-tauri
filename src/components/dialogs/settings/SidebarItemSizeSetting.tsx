import { useTranslation } from "react-i18next"
import { File, Folder as FolderIcon } from "lucide-react"
import { usePreferences } from "@/contexts/use-preferences"
import type { SidebarItemSize } from "@/lib/store/preferences"
import { ITEM_SIZES } from "@/pages/workspacePage/components/sidebar/item-size"
import { SegmentedSetting } from "./SegmentedSetting"

const OPTIONS: SidebarItemSize[] = ["compact", "normal", "large"]

const PreviewRow = ({ size, icon: Icon, name }: { size: SidebarItemSize, icon: typeof File, name: string }) => {
    const classes = ITEM_SIZES[size]
    return (
        <div className={`flex items-center gap-1 px-1 w-40 rounded-xs border border-accent bg-background ${classes.row}`}>
            <Icon className={`${classes.icon} shrink-0`} />
            <span className={`${classes.text} truncate`}>{name}</span>
        </div>
    )
}

export const SidebarItemSizeSetting = () => {
    const { t } = useTranslation()
    const { sidebarItemSize, setSidebarItemSize } = usePreferences()

    return (
        <div className="flex flex-col gap-3">
            <SegmentedSetting
                label={t("settings.appearance.sidebarSize.label")}
                description={t("settings.appearance.sidebarSize.description")}
                value={sidebarItemSize}
                options={OPTIONS.map(value => ({ value, label: t(`settings.appearance.sidebarSize.${value}`) }))}
                onChange={setSidebarItemSize}
            />
            <div aria-hidden className="flex flex-col gap-1 self-start" data-testid="sidebar-size-preview">
                <PreviewRow size={sidebarItemSize} icon={FolderIcon} name={t("settings.appearance.sidebarSize.previewFolder")} />
                <PreviewRow size={sidebarItemSize} icon={File} name={t("settings.appearance.sidebarSize.previewNote")} />
            </div>
        </div>
    )
}
