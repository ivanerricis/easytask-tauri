import { useTranslation } from "react-i18next"
import type { Folder } from "@/types/types"
import { getErrorMessage } from "@/lib/utils"
import { DialogAddSubFolder } from "./DialogAddSubFolder"
import { DialogAddNote } from "./DialogAddNote"
import { useState, type ReactElement } from "react"
import { ButtonInPopover } from "@/components/button-in-popover"
import { toast } from "sonner"
import { useWorkspaceData } from "@/contexts/workspace-data"
import { Separator } from "@/components/ui/separator"
import { DialogDeleteItem } from "@/components/dialogs/dialog-delete"
import { DialogRenameItem } from "@/components/dialogs/dialog-rename"
import { DialogAddColor } from "@/components/dialogs/dialog-add-color"
import { MoveToSubmenu } from "../MoveToSubmenu"
import { MenuGroup, MenuSub, MenuSubContent, MenuSubTrigger } from "@/components/menu-kind"
import { ItemMenu } from "@/components/item-menu"
import { useItemMenuState } from "@/hooks/use-item-menu-state"

type ButtonMenuFolderProps = {
    folder: Folder
    /** The folder row: right click on it opens this menu, its <ItemMenuButton /> opens it below the button. */
    children: ReactElement
}

export const ButtonMenuFolder = ({ folder, children }: ButtonMenuFolderProps) => {
    const { t } = useTranslation()
    const [isAddSubFolderOpen, setAddSubFolderOpen] = useState(false);
    const [isAddNoteOpen, setAddNoteOpen] = useState(false);
    const [isRenameOpen, setRenameOpen] = useState(false);
    const [isDeleteFolderOpen, setDeleteFolderOpen] = useState(false);
    const menu = useItemMenuState()
    // Rename, color and delete are applied to the sidebar tree by the context: the dialogs need no reload
    const { updateFolderColorContent, updateItemColor } = useWorkspaceData()

    const handleColorContent = async () => {
        try {
            // Applied to the sidebar tree by the context
            await updateFolderColorContent(folder.id, folder.color ?? undefined)
        } catch (err) {
            toast.error(getErrorMessage(err))
        }
    }

    const items = (
        <MenuGroup className="flex flex-col gap-1 p-1">
            <ButtonInPopover
                text={t("menu.newNote")}
                type="addNote"
                onClick={() => { setAddNoteOpen(true); menu.close() }}
            />
            <ButtonInPopover
                text={t("menu.newFolder")}
                type="addFolder"
                onClick={() => { setAddSubFolderOpen(true); menu.close() }}
            />
            <ButtonInPopover
                text={t("common.rename")}
                type="rename"
                onClick={() => { setRenameOpen(true); menu.close() }}
            />
            <ButtonInPopover
                text={t("menu.colorContent")}
                type="colorContent"
                onClick={() => { handleColorContent(); menu.close() }}
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
                        item={folder}
                        itemType="folder"
                        addColorItem={updateItemColor}
                        setDropDownOpen={menu.close}
                    />
                </MenuSubContent>
            </MenuSub>
            <MoveToSubmenu
                itemType="folder"
                itemId={folder.id}
                folderID={folder.folderID}
                onDone={menu.close}
            />
            <Separator />
            <ButtonInPopover
                text={t("common.delete")}
                type="delete"
                destructive
                onClick={() => { setDeleteFolderOpen(true); menu.close() }}
            />
        </MenuGroup>
    )

    const dialogs = (
        <>
            <DialogAddNote
                parentFolder={folder}
                isOpen={isAddNoteOpen}
                onOpenChange={setAddNoteOpen}
            />
            <DialogAddSubFolder
                parentFolder={folder}
                isOpen={isAddSubFolderOpen}
                onOpenChange={setAddSubFolderOpen}
            />
            <DialogRenameItem
                item={folder}
                itemType="folder"
                isOpen={isRenameOpen}
                onOpenChange={setRenameOpen}
            />
            <DialogDeleteItem
                item={folder}
                itemType="folder"
                isOpen={isDeleteFolderOpen}
                onOpenChange={setDeleteFolderOpen}
            />
        </>
    )

    return (
        <ItemMenu state={menu} items={items} dialogs={dialogs} contentClassName="rounded-xs">
            {children}
        </ItemMenu>
    )
}
