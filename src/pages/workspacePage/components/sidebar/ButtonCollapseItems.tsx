import { useTranslation } from "react-i18next"
import { ListChevronsUpDown, ListCollapse } from "lucide-react"
import { SidebarIconButton } from "./SidebarIconButton"

type ButtonCollapseItemsProps = {
    allCollapsed: boolean
    onToggle: () => void
    disabled?: boolean
}

export const ButtonCollapseItems = ({ allCollapsed, onToggle, disabled }: ButtonCollapseItemsProps) => {
    const { t } = useTranslation()
    return (
        <SidebarIconButton
            label={allCollapsed ? t("sidebar.expandAll") : t("sidebar.collapseAll")}
            icon={allCollapsed ? <ListChevronsUpDown /> : <ListCollapse />}
            onClick={onToggle}
            disabled={disabled}
        />
    )
}
