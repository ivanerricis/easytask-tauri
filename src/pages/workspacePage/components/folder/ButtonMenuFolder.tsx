import type { Folder } from "@/types/types"
import { EllipsisVertical } from "lucide-react"
import { DialogAddSubFolder } from "./DialogAddSubFolder"
import { DialogAddNote } from "./DialogAddNote"
import { useState } from "react"
import { ButtonInPopover } from "@/components/button-in-popover"
import { toast } from "sonner"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import { useWorkspace } from "@/contexts/workspace-context"
import { Separator } from "@/components/ui/separator"
import { DialogDeleteItem } from "@/components/dialogs/dialog-delete"
import { DialogRenameItem } from "@/components/dialogs/dialog-rename"
import { DialogAddColor } from "@/components/dialogs/dialog-add-color"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

type ButtonMenuFolderProps = {
    folder: Folder
}

export const ButtonMenuFolder = ({ folder }: ButtonMenuFolderProps) => {
    const [isAddSubFolderOpen, setAddSubFolderOpen] = useState(false);
    const [isAddNoteOpen, setAddNoteOpen] = useState(false);
    const [isRenameOpen, setRenameOpen] = useState(false);
    const [isDeleteFolderOpen, setDeleteFolderOpen] = useState(false);
    const [dropDownOpen, setDropDownOpen] = useState(false);
    const { updateFolderColorContent, getWorkspaceData, updateItemColor } = useWorkspaceData()
    const { currentWorkspace } = useWorkspace()

    const handleColorContent = async () => {
        try {
            await updateFolderColorContent(folder.id, folder.color ?? undefined)
            if (currentWorkspace)
                await getWorkspaceData(currentWorkspace.id)
        } catch (err: any) {
            toast.error(err.messsage)
        }
    }

    return (
        <>
            <DropdownMenu open={dropDownOpen} onOpenChange={setDropDownOpen}>
                <DropdownMenuTrigger asChild>
                    <div
                        role="button"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 rounded-xs cursor-pointer"
                    >
                        <EllipsisVertical className="size-4" />
                    </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    onClick={(e) => e.stopPropagation()}
                    className="rounded-xs"
                >

                    <DropdownMenuGroup className="flex flex-col gap-1 p-1">
                        <ButtonInPopover
                            text="Nuova nota"
                            type="addNote"
                            onClick={() => { setAddNoteOpen(true); setDropDownOpen(false) }}
                        />
                        <ButtonInPopover
                            text="Nuova cartella"
                            type="addFolder"
                            onClick={() => { setAddSubFolderOpen(true); setDropDownOpen(false) }}
                        />
                        <ButtonInPopover
                            text="Rinomina"
                            type="rename"
                            onClick={() => { setRenameOpen(true); setDropDownOpen(false) }}
                        />
                        <ButtonInPopover
                            text="Colora contenuto"
                            type="colorContent"
                            onClick={() => { handleColorContent(); setDropDownOpen(false) }}
                        />
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                                <ButtonInPopover
                                    text="Cambia colore"
                                    type="color"
                                />
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                                <DialogAddColor
                                    item={folder}
                                    itemType="folder"
                                    addColorItem={updateItemColor}
                                    getItemId={currentWorkspace?.id}
                                    getItemData={getWorkspaceData}
                                    setDropDownOpen={setDropDownOpen}
                                />
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <Separator />
                        <ButtonInPopover
                            text="Elimina"
                            type="delete"
                            destructive
                            onClick={() => { setDeleteFolderOpen(true); setDropDownOpen(false) }}
                        />
                    </DropdownMenuGroup>
                </DropdownMenuContent>
            </DropdownMenu>

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
                getItemId={currentWorkspace?.id}
                getItemData={getWorkspaceData}
            />
            <DialogDeleteItem
                item={folder}
                itemType="folder"
                isOpen={isDeleteFolderOpen}
                onOpenChange={setDeleteFolderOpen}
                getItemId={currentWorkspace?.id}
                getItemData={getWorkspaceData}
            />
        </>
    )
}