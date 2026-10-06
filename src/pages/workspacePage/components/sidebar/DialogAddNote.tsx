import { useTranslation } from "react-i18next"
import { TooltipCustom } from "@/components/tooltip-custom"
import { useShortcut } from "@/hooks/use-shortcut"
import { useShortcutLabel } from "@/contexts/use-shortcuts"
import { Button } from "@/components/ui/button"
import { FilePlus } from "lucide-react"
import { useState } from "react"
import { AddNoteDialog } from "../AddNoteDialog"

/** Sidebar button (and shortcut) that creates a note in the workspace root. */
export function DialogAddNote() {
    const { t } = useTranslation()
    const [isOpen, setIsOpen] = useState(false)

    useShortcut("new-note", () => setIsOpen(true))
    const shortcutLabel = useShortcutLabel("new-note")

    return (
        <>
            <AddNoteDialog open={isOpen} onOpenChange={setIsOpen} parentId={null} withColor />

            <TooltipCustom text={t("sidebar.addNote")} shortcut={shortcutLabel}>
                <Button
                    onClick={() => setIsOpen(true)}
                    variant='buttonIcon'
                    size="icon"
                    aria-label={t("sidebar.addNote")}
                >
                    <FilePlus />
                </Button>
            </TooltipCustom>
        </>
    )
}
