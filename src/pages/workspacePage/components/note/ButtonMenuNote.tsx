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
import { DialogAddColor } from "@/components/dialogs/dialog-add-color"
import { MoveToSubmenu } from "../MoveToSubmenu"
import { MenuGroup, MenuSub, MenuSubContent, MenuSubTrigger } from "@/components/menu-kind"
import { ItemMenu } from "@/components/item-menu"
import { useItemMenuState } from "@/hooks/use-item-menu-state"
import { useUndoRecorder } from "@/contexts/undo/use-undo"
import { getErrorMessage } from "@/lib/utils"
import { toast } from "sonner"

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
    const menu = useItemMenuState()
    const { updateItemColor, duplicateNote } = useWorkspaceActions()
    const { openNote } = useTabsActions()
    const recorder = useUndoRecorder()

    // The copy is added to the tree by the context: open it in a tab and make the creation undoable
    const handleDuplicate = async () => {
        menu.close()
        try {
            const id = await duplicateNote(note.id)
            recorder.create("note", id, null)
            openNote(id)
            toast.success(t("duplicate.noteDone"))
        } catch (error) {
            toast.error(getErrorMessage(error))
        }
    }

    const items = (
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
            <MenuSub>
                <MenuSubTrigger>
                    <ButtonInPopover
                        text={t("menu.changeColor")}
                        type="color"
                    />
                </MenuSubTrigger>
                <MenuSubContent>
                    <DialogAddColor
                        item={note}
                        itemType="note"
                        addColorItem={updateItemColor}
                        setDropDownOpen={menu.close}
                    />
                </MenuSubContent>
            </MenuSub>
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
            <Separator />
            <ButtonInPopover
                text={t("common.delete")}
                type="delete"
                destructive
                onClick={() => { setDeleteOpen(true); menu.close() }}
            />
        </MenuGroup>
    )

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
