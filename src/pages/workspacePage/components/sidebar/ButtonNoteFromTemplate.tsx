import { LayoutTemplate } from "lucide-react"
import { useTranslation } from "react-i18next"
import { TooltipCustom } from "@/components/tooltip-custom"
import { Button } from "@/components/ui/button"
import { requestAppCommand } from "@/lib/app-commands"

/**
 * Header button: create a note from a template (first the template is chosen, then the note gets its name and folder).
 * @category Sidebar
 */
export const ButtonNoteFromTemplate = () => {
    const { t } = useTranslation()

    return (
        <TooltipCustom text={t("sidebar.addNoteFromTemplate")}>
            <Button variant="buttonIcon" size="icon" aria-label={t("sidebar.addNoteFromTemplate")} onClick={() => requestAppCommand("note-from-template")}>
                <LayoutTemplate />
            </Button>
        </TooltipCustom>
    )
}
