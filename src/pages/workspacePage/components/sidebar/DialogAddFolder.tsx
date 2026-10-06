import { useTranslation } from "react-i18next"
import { TooltipCustom } from "@/components/tooltip-custom"
import { useShortcut } from "@/hooks/use-shortcut"
import { useShortcutLabel } from "@/contexts/use-shortcuts"
import { Button } from "@/components/ui/button"
import { FolderPlus } from "lucide-react"
import { useState } from "react"
import { AddFolderDialog } from "../AddFolderDialog"

/** Sidebar button (and shortcut) that creates a folder in the workspace root. */
export function DialogAddFolder() {
    const { t } = useTranslation()
    const [isOpen, setIsOpen] = useState(false)

    useShortcut("new-folder", () => setIsOpen(true))
    const shortcutLabel = useShortcutLabel("new-folder")

    return (
        <>
            <AddFolderDialog open={isOpen} onOpenChange={setIsOpen} parentId={null} withColor />

            <TooltipCustom text={t("sidebar.addFolder")} shortcut={shortcutLabel}>
                <Button
                    onClick={() => setIsOpen(true)}
                    variant='buttonIcon'
                    size="icon"
                    aria-label={t("sidebar.addFolder")}
                >
                    <FolderPlus />
                </Button>
            </TooltipCustom>
        </>
    )
}
