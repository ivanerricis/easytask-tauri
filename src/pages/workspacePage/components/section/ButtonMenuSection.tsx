import { useTranslation } from "react-i18next"
import { lazy, useState, type ReactElement } from "react"
import { ButtonInPopover } from "@/components/button-in-popover"
import { ColorSubmenu } from "../ColorSubmenu"
import type { DBItemType } from "@/db/queries/shared_queries"
import type { Section } from "@/types/types"
import { useWorkspaceActions } from "@/contexts/workspace-data"
import { useActiveNoteActions } from "@/contexts/use-active-note"
import { Separator } from "@/components/ui/separator"
import { DialogDeleteItem } from "@/components/dialogs/dialog-delete"
import { DialogRenameItem } from "@/components/dialogs/dialog-rename"
import { SectionMoveSubmenu } from "../NoteMoveSubmenus"
import { SectionStepMoves } from "../NoteStepMoves"
import { MenuGroup } from "@/components/menu-kind"
import { ItemMenu } from "@/components/item-menu"
import { useItemMenuState } from "@/hooks/use-item-menu-state"
import { useUndoRecorder } from "@/contexts/undo/use-undo"
import { getErrorMessage } from "@/lib/utils"
import { reportError } from "@/lib/report-error"
import { toast } from "sonner"
import { withRollback } from "@/contexts/with-rollback"
import { LazyMount } from "@/components/lazy-mount"
import { useActiveNoteId } from "@/contexts/use-tabs"

const DialogAutomations = lazy(() => import("@/components/dialogs/dialog-automations").then(m => ({ default: m.DialogAutomations })))

type ButtonMenuSectionProps = {
    section: Section
    /** The section header: right click on it opens this menu, its <ItemMenuButton /> opens it below the button. */
    children: ReactElement
}

export const ButtonMenuSection = ({ section, children }: ButtonMenuSectionProps) => {
    const { t } = useTranslation()
    const [isRenameOpen, setRenameOpen] = useState(false)
    const [isDeleteOpen, setDeleteOpen] = useState(false)
    const [isAutomationsOpen, setAutomationsOpen] = useState(false)
    const noteId = useActiveNoteId()
    const menu = useItemMenuState()
    const { updateItemColor, duplicateSection, archiveItem } = useWorkspaceActions()
    const { patchSection, removeSection, refreshActiveNote } = useActiveNoteActions()
    const recorder = useUndoRecorder()

    // The copy is placed right after the original: reload the open note to show it
    const handleDuplicate = async () => {
        menu.close()
        try {
            const id = await duplicateSection(section.id)
            recorder.create("section", id, null)
            await refreshActiveNote()
            toast.success(t("duplicate.sectionDone"))
        } catch (error) {
            reportError(error, getErrorMessage(error))
        }
    }

    // The color is applied to the cached tree at once and restored if the write fails
    const addColorItem = async (itemType: DBItemType, itemId: number, color?: string) => {
        const rollback = patchSection(itemId, { color: color ?? null })
        try {
            await updateItemColor(itemType, itemId, color)
        } catch (error) {
            rollback()
            throw error
        }
    }

    // Removed from the open note at once (put back if the write fails); no confirmation, undo brings it back
    const handleArchive = async () => {
        menu.close()
        try {
            await withRollback(removeSection(section.id), () => archiveItem("section", section.id))
            recorder.archive("section", section.id, section.title)
        } catch (error) {
            reportError(error, getErrorMessage(error))
        }
    }

    const items = (
        <MenuGroup className="flex flex-col gap-1">
            <ButtonInPopover
                text={t("common.rename")}
                type="rename"
                onClick={() => {
                    setRenameOpen(true)
                    menu.close()
                }}
            />
            <ButtonInPopover
                text={t("menu.duplicate")}
                type="duplicate"
                onClick={handleDuplicate}
            />
            <ColorSubmenu
                item={section}
                itemType="section"
                addColorItem={addColorItem}
                onDone={menu.close}
            />
            <SectionStepMoves sectionId={section.id} onDone={menu.close} />
            <SectionMoveSubmenu sectionId={section.id} onDone={menu.close} />
            {noteId !== null && <ButtonInPopover
                text={t("automations.menu")}
                type="automations"
                onClick={() => {
                    setAutomationsOpen(true)
                    menu.close()
                }}
            />}
            <ButtonInPopover
                text={t("menu.archive")}
                type="archive"
                onClick={handleArchive}
            />
            <Separator />
            <ButtonInPopover
                text={t("common.delete")}
                type="delete"
                destructive
                onClick={() => {
                    setDeleteOpen(true)
                    menu.close()
                }}
            />
        </MenuGroup>
    )

    const dialogs = (
        <>
            <DialogRenameItem
                item={section}
                itemType="section"
                isOpen={isRenameOpen}
                onOpenChange={setRenameOpen}
                optimistic={title => patchSection(section.id, { title })}
            />
            {noteId !== null && <LazyMount active={isAutomationsOpen}>
                <DialogAutomations
                    noteId={noteId}
                    sectionId={section.id}
                    isOpen={isAutomationsOpen}
                    onOpenChange={setAutomationsOpen}
                />
            </LazyMount>}
            <DialogDeleteItem
                item={section}
                itemType="section"
                isOpen={isDeleteOpen}
                onOpenChange={setDeleteOpen}
                optimistic={() => removeSection(section.id)}
            />
        </>
    )

    return (
        <ItemMenu state={menu} items={items} dialogs={dialogs} contentClassName="p-1 rounded-xs">
            {children}
        </ItemMenu>
    )
}
