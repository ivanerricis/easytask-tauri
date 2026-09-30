import { TooltipCustom } from "@/components/tooltip-custom"
import { Button } from "@/components/ui/button"
import { ListChevronsUpDown, ListCollapse } from "lucide-react"

type ButtonCollapseItemsProps = {
    allCollapsed: boolean
    onToggle: () => void
    disabled?: boolean
}

export const ButtonCollapseItems = ({ allCollapsed, onToggle, disabled }: ButtonCollapseItemsProps) => {
    return (
        <TooltipCustom text={allCollapsed ? "Espandi tutte le cartelle" : "Comprimi tutte le cartelle"}>
            <Button variant={"buttonIcon"} size={"icon"} disabled={disabled} onClick={onToggle}
                aria-label={allCollapsed ? "Espandi tutte le cartelle" : "Comprimi tutte le cartelle"}>
                {allCollapsed ? <ListChevronsUpDown /> : <ListCollapse />}
            </Button>
        </TooltipCustom>
    )
}
