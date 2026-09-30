import { File, Folder as FolderIcon } from "lucide-react"
import { usePreferences } from "@/contexts/preferences-context"
import type { SidebarItemSize } from "@/lib/store/preferences"
import { ITEM_SIZES } from "@/pages/workspacePage/components/sidebar/item-size"
import { SettingsRow } from "./SettingsRow"

const OPTIONS: { value: SidebarItemSize, label: string }[] = [
    { value: "compact", label: "Compatta" },
    { value: "normal", label: "Normale" },
    { value: "large", label: "Grande" },
]

const LABEL = "Dimensione di cartelle e note"

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
    const { sidebarItemSize, setSidebarItemSize } = usePreferences()

    return (
        <div className="flex flex-col gap-3">
            <SettingsRow label={LABEL} description="Vale sia per le cartelle che per le note nella barra laterale.">
                <div role="radiogroup" aria-label={LABEL} className="flex rounded-xs border p-0.5 gap-0.5">
                    {OPTIONS.map(({ value, label }) => (
                        <button
                            key={value}
                            type="button"
                            role="radio"
                            aria-checked={sidebarItemSize === value}
                            onClick={() => setSidebarItemSize(value)}
                            className={`px-2 py-1 text-xs rounded-xs cursor-pointer ${sidebarItemSize === value ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </SettingsRow>
            <div aria-hidden className="flex flex-col gap-1 self-start" data-testid="sidebar-size-preview">
                <PreviewRow size={sidebarItemSize} icon={FolderIcon} name="Cartella" />
                <PreviewRow size={sidebarItemSize} icon={File} name="Nota" />
            </div>
        </div>
    )
}
