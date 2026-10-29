import { useTranslation } from "react-i18next"
import { TooltipCustom } from "@/components/tooltip-custom"
import { useShortcut } from "@/hooks/use-shortcut"
import { useShortcutLabel } from "@/contexts/use-shortcuts"
import { Button } from "@/components/ui/button"
import { FilePlus, FolderPlus } from "lucide-react"
import { useState } from "react"
import { AddNoteDialog } from "../AddNoteDialog"
import { AddFolderDialog } from "../AddFolderDialog"

const KINDS = {
    note: { shortcut: "new-note", label: "sidebar.addNote", Icon: FilePlus, Dialog: AddNoteDialog },
    folder: { shortcut: "new-folder", label: "sidebar.addFolder", Icon: FolderPlus, Dialog: AddFolderDialog },
} as const

/** Sidebar button (and shortcut) that creates a note or a folder in the workspace root. */
export function AddRootItemButton({ kind }: { kind: keyof typeof KINDS }) {
    const { t } = useTranslation()
    const [isOpen, setIsOpen] = useState(false)
    const { shortcut, label, Icon, Dialog } = KINDS[kind]

    useShortcut(shortcut, () => setIsOpen(true))
    const shortcutLabel = useShortcutLabel(shortcut)

    return (
        <>
            <Dialog open={isOpen} onOpenChange={setIsOpen} parentId={null} withColor />

            <TooltipCustom text={t(label)} shortcut={shortcutLabel}>
                <Button
                    onClick={() => setIsOpen(true)}
                    variant='buttonIcon'
                    size="icon"
                    aria-label={t(label)}
                >
                    <Icon />
                </Button>
            </TooltipCustom>
        </>
    )
}
