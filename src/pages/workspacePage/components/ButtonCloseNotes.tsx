import { TooltipCustom } from "@/components/tooltip-custom"
import { Button } from "@/components/ui/button"
import { useTabs, useTabsActions } from "@/contexts/use-tabs"
import { CopyMinus } from "lucide-react"

export const ButtonCloseNotes = () => {

    const { openIds } = useTabs()
    const { closeAllNotes } = useTabsActions()

    const closeNotes = (e: React.MouseEvent) => {
        e.stopPropagation()
        closeAllNotes()
    }

    return (
        <TooltipCustom text="Chiudi tutte le note" shortcut="(Ctrl + T)">
            <Button
                variant={"buttonIcon"}
                size={"icon"}
                aria-label="Chiudi tutte le note"
                disabled={openIds.length === 0}
                onClick={closeNotes}
            >
                <CopyMinus className="scale-x-[-1]" />
            </Button>
        </TooltipCustom>
    )
}
