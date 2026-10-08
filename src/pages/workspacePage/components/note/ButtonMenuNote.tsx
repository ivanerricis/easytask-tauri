import { useTranslation } from "react-i18next"
import { lazy, useState, type ReactElement } from "react"
import type { Note } from "@/types/types"
import { useWorkspaceActions } from "@/contexts/workspace-data"
import { useTabsActions } from "@/contexts/use-tabs"
import { ButtonInPopover } from "@/components/button-in-popover"
import { DialogRenameItem } from "@/components/dialogs/dialog-rename"
import { LazyMount } from "@/components/lazy-mount"
import { DialogDeleteItem } from "@/components/dialogs/dialog-delete"
import { Separator } from "@/components/ui/separator"
import { ColorSubmenu } from "../ColorSubmenu"
import { MoveToSubmenu } from "../MoveToSubmenu"
import { MenuGroup } from "@/components/menu-kind"
import { ItemMenu } from "@/components/item-menu"
import { useIsInMultiSelection } from "../sidebar/selection-context"
import { SelectionMenuItems } from "../sidebar/SelectionMenu"
import { useItemMenuState } from "@/hooks/use-item-menu-state"
import { useUndoRecorder } from "@/contexts/undo/use-undo"
import { getErrorMessage } from "@/lib/utils"
import { reportError } from "@/lib/report-error"
import { toast } from "sonner"
import { useItemTransfer } from "@/hooks/use-workspace-transfer"

const DialogAutomations = lazy(() => import("@/components/dialogs/dialog-automations").then(m => ({ default: m.DialogAutomations })))
const DialogCreateTemplate = lazy(() => import("@/components/dialogs/dialog-create-template").then(m => ({ default: m.DialogCreateTemplate })))

type ButtonMenuNoteProps = {
    note: Note
    /** The note row or tab: right click on it opens this menu, its <ItemMenuButton /> opens it below the button. */
    children: ReactElement
}

export const ButtonMenuNote = ({ note, children }: ButtonMenuNoteProps) => {
    const { t } = useTranslation()
    const [isRenameOpen, setRenameOpen] = useState(false);
    const [isDeleteOpen, setDeleteOpen] = useState(false);
    const [isTemplateOpen, setTemplateOpen] = useState(false);
    const [isAutomationsOpen, setAutomationsOpen] = useState(false);
    const menu = useItemMenuState()
    const multi = useIsInMultiSelection("note", note.id)
    const { updateItemColor, duplicateNote, archiveItem } = useWorkspaceActions()
    const { openNote } = useTabsActions()
    const recorder = useUndoRecorder()
    const { exportItem } = useItemTransfer()

    // The copy is added to the tree by the context: open it in a tab and make the creation undoable
    const handleDuplicate = async () => {
        menu.close()
        try {
            const id = await duplicateNote(note.id)
            recorder.create("note", id, null)
            openNote(id)
            toast.success(t("duplicate.noteDone"))
        } catch (error) {
            reportError(error, getErrorMessage(error))
        }
    }

    // No confirmation: the note leaves the sidebar and the archive dialog (or undo) brings it back
    const handleArchive = async () => {
        menu.close()
        try {
            await archiveItem("note", note.id)
            recorder.archive("note", note.id, note.name)
        } catch (error) {
            reportError(error, getErrorMessage(error))
        }
    }

    const singleItems = (
        <MenuGroup className="flex flex-col gap-1">
            <ButtonInPopover
                text={t("menu.open")}
                type="open"
                onClick={() => { openNote(note.id); menu.close() }}
            />
            <ButtonInPopover
                text={t("common.rename")}
                type="rename"
                onClick={() => { setRenameOpen(true); menu.close() }}
            />
            <ButtonInPopover
                text={t("menu.duplicate")}
                type="duplicate"
                onClick={handleDuplicate}
            />
            <ColorSubmenu
                item={note}
                itemType="note"
                addColorItem={updateItemColor}
                onDone={menu.close}
            />
            <MoveToSubmenu
                itemType="note"
                itemId={note.id}
                folderID={note.folderID}
                onDone={menu.close}
            />
            <ButtonInPopover
                text={t("menu.createTemplate")}
                type="createTemplate"
                onClick={() => { setTemplateOpen(true); menu.close() }}
            />
            <ButtonInPopover
                text={t("automations.menu")}
                type="automations"
                onClick={() => { setAutomationsOpen(true); menu.close() }}
            />
            <ButtonInPopover
                text={t("menu.export")}
                type="export"
                onClick={() => { menu.close(); void exportItem("note", note) }}
            />
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
                onClick={() => { setDeleteOpen(true); menu.close() }}
            />
        </MenuGroup>
    )

    // A selected row of a multi-selection acts on the whole selection
    const items = multi ? <SelectionMenuItems menu={menu} /> : singleItems

    const dialogs = (
        <>
            <DialogRenameItem
                item={note}
                itemType="note"
                isOpen={isRenameOpen}
                onOpenChange={setRenameOpen}
            />
            <LazyMount active={isTemplateOpen}>
                <DialogCreateTemplate
                    note={note}
                    isOpen={isTemplateOpen}
                    onOpenChange={setTemplateOpen}
                />
            </LazyMount>
            <LazyMount active={isAutomationsOpen}>
                <DialogAutomations
                    noteId={note.id}
                    isOpen={isAutomationsOpen}
                    onOpenChange={setAutomationsOpen}
                />
            </LazyMount>
            <DialogDeleteItem
                item={note}
                itemType="note"
                isOpen={isDeleteOpen}
                onOpenChange={setDeleteOpen}
            />
        </>
    )

    return (
        <ItemMenu state={menu} items={items} dialogs={dialogs} contentClassName="p-1 rounded-xs">
            {children}
        </ItemMenu>
    )
}
