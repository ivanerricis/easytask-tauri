import { useTranslation } from "react-i18next"
import { TooltipCustom } from "@/components/tooltip-custom"
import { Button } from "@/components/ui/button"
import { ListChevronsUpDown, ListCollapse } from "lucide-react"

type ButtonCollapseItemsProps = {
    allCollapsed: boolean
    onToggle: () => void
    disabled?: boolean
}

export const ButtonCollapseItems = ({ allCollapsed, onToggle, disabled }: ButtonCollapseItemsProps) => {
    const { t } = useTranslation()
    const label = allCollapsed ? t("sidebar.expandAll") : t("sidebar.collapseAll")
    return (
        <TooltipCustom text={label}>
            {/* The span keeps the tooltip when the button is disabled (a disabled button gets no pointer events) */}
            <span className="inline-flex">
                <Button variant={"buttonIcon"} size={"icon"} disabled={disabled} onClick={onToggle}
                    aria-label={label}>
                    {allCollapsed ? <ListChevronsUpDown /> : <ListCollapse />}
                </Button>
            </span>
        </TooltipCustom>
    )
}
