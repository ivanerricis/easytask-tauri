import { useState, type ReactElement } from "react"
import type { Note } from "@/types/types"
import { useWorkspaceActions } from "@/contexts/workspace-data-context"
import { useTabsActions } from "@/contexts/tabs-context"
import { ButtonInPopover } from "@/components/button-in-popover"
import { DialogRenameItem } from "@/components/dialogs/dialog-rename"
import { useWorkspace } from "@/contexts/workspace-context"
import { DialogCreateTemplate } from "@/components/dialogs/dialog-create-template"
import { DialogDeleteItem } from "@/components/dialogs/dialog-delete"
import { Separator } from "@/components/ui/separator"
import { DialogAddColor } from "@/components/dialogs/dialog-add-color"
import { MoveToSubmenu } from "../MoveToSubmenu"
import { MenuGroup, MenuSub, MenuSubContent, MenuSubTrigger } from "@/components/menu-kind"
import { ItemMenu } from "@/components/item-menu"
import { useItemMenuState } from "@/hooks/use-item-menu-state"

type ButtonMenuNoteProps = {
    note: Note
    /** The note row or tab: right click on it opens this menu, its <ItemMenuButton /> opens it below the button. */
    children: ReactElement
}

export const ButtonMenuNote = ({ note, children }: ButtonMenuNoteProps) => {
    const [isRenameOpen, setRenameOpen] = useState(false);
    const [isDeleteOpen, setDeleteOpen] = useState(false);
    const [isTemplateOpen, setTemplateOpen] = useState(false);
    const menu = useItemMenuState()
    const { currentWorkspace } = useWorkspace()
    const { getWorkspaceData, updateItemColor } = useWorkspaceActions()
    const { openNote } = useTabsActions()

    const items = (
        <MenuGroup className="flex flex-col gap-1">
            <ButtonInPopover
                text="Apri"
                type="open"
                onClick={() => { openNote(note.id); menu.close() }}
            />
            <ButtonInPopover
                text="Rinomina"
                type="rename"
                onClick={() => { setRenameOpen(true); menu.close() }}
            />
            <MenuSub>
                <MenuSubTrigger>
                    <ButtonInPopover
                        text="Cambia colore"
                        type="color"
                    />
                </MenuSubTrigger>
                <MenuSubContent>
                    <DialogAddColor
                        item={note}
                        itemType="note"
                        addColorItem={updateItemColor}
                        getItemId={currentWorkspace?.id}
                        getItemData={getWorkspaceData}
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
                text="Crea template"
                type="createTemplate"
                onClick={() => { setTemplateOpen(true); menu.close() }}
            />
            <Separator />
            <ButtonInPopover
                text="Elimina"
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
                getItemId={currentWorkspace?.id}
                getItemData={getWorkspaceData}
            />
            <DialogCreateTemplate
                note={note}
                isOpen={isTemplateOpen}
                onOpenChange={setTemplateOpen}
            />
            <DialogDeleteItem
                item={note}
                itemType="note"
                isOpen={isDeleteOpen}
                onOpenChange={setDeleteOpen}
                getItemId={currentWorkspace?.id}
                getItemData={getWorkspaceData}
            />
        </>
    )

    return (
        <ItemMenu state={menu} items={items} dialogs={dialogs} contentClassName="p-1 rounded-xs">
            {children}
        </ItemMenu>
    )
}
