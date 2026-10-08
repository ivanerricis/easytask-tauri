import { useTranslation } from "react-i18next"
import { TooltipCustom } from "@/components/tooltip-custom"
import { Button } from "@/components/ui/button"
import { useTabs, useTabsActions } from "@/contexts/use-tabs"
import { useShortcutLabel } from "@/contexts/use-shortcuts"
import { CopyMinus } from "lucide-react"

export const ButtonCloseNotes = () => {
    const { t } = useTranslation()
    const { openIds } = useTabs()
    const { closeAllNotes } = useTabsActions()
    const shortcutLabel = useShortcutLabel("close-all-notes")

    const closeNotes = (e: React.MouseEvent) => {
        e.stopPropagation()
        closeAllNotes()
    }

    return (
        <TooltipCustom text={t("notes.closeAll")} shortcut={shortcutLabel}>
            {/* The span keeps the tooltip when the button is disabled (a disabled button gets no pointer events) */}
            <span className="inline-flex">
                <Button
                    variant={"buttonIcon"}
                    size={"icon"}
                    aria-label={t("notes.closeAll")}
                    disabled={openIds.length === 0}
                    onClick={closeNotes}
                >
                    <CopyMinus className="scale-x-[-1]" />
                </Button>
            </span>
        </TooltipCustom>
    )
}
