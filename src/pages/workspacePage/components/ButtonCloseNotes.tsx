import { TooltipCustom } from "@/components/tooltip-custom"
import { Button } from "@/components/ui/button"
import { useTabs, useTabsActions } from "@/contexts/tabs-context"
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
                disabled={openIds.length === 0}
                onClick={closeNotes}
            >
                <CopyMinus className="scale-x-[-1]" />
            </Button>
        </TooltipCustom>
    )
}
