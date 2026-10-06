import { Upload } from "lucide-react"
import { useTranslation } from "react-i18next"
import { TooltipCustom } from "@/components/tooltip-custom"
import { Button } from "@/components/ui/button"
import { useItemTransfer } from "@/hooks/use-workspace-transfer"

/**
 * Header button: import a note or a folder from an export file into the workspace root
 * (the menu of a folder has "Import here" for importing inside it).
 * @category Sidebar
 */
export const ButtonImportItems = () => {
    const { t } = useTranslation()
    const { importItems, isBusy } = useItemTransfer()

    return (
        <TooltipCustom text={t("sidebar.importItems")}>
            <Button variant="buttonIcon" size="icon" aria-label={t("sidebar.importItems")} disabled={isBusy} onClick={() => void importItems(null)}>
                <Upload />
            </Button>
        </TooltipCustom>
    )
}
