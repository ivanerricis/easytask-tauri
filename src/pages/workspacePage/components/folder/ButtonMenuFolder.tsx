import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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

type ButtonMenuFolderProps = {
    folder: Folder
}

export const ButtonMenuFolder = ({ folder }: ButtonMenuFolderProps) => {
    const [isAddSubFolderOpen, setAddSubFolderOpen] = useState(false);
    const [isAddNoteOpen, setAddNoteOpen] = useState(false);
    const [isRenameOpen, setRenameOpen] = useState(false);
    const [isColorOpen, setColorOpen] = useState(false);
    const [isDeleteFolderOpen, setDeleteFolderOpen] = useState(false);
    const [popoverOpen, setPopoverOpen] = useState(false);
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
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                    <div onClick={(e) => e.stopPropagation()} className="p-1 rounded-xs cursor-pointer">
                        <EllipsisVertical className="!h-4 !w-4" />
                    </div>
                </PopoverTrigger>
                <PopoverContent
                    onClick={(e) => { e.stopPropagation() }}
                    className="flex justify-center gap-1 w-auto p-0 bg-transparent border-none"
                >
                    <div className="flex flex-col gap-1 p-1 border bg-background">
                        <ButtonInPopover
                            text="Aggiungi cartella"
                            type="addFolder"
                            onClick={() => { setAddSubFolderOpen(true); setPopoverOpen(false) }}
                        />
                        <ButtonInPopover
                            text="Aggiungi nota"
                            type="addNote"
                            onClick={() => { setAddNoteOpen(true); setPopoverOpen(false) }}
                        />
                        <ButtonInPopover
                            text="Rinomina"
                            type="rename"
                            onClick={() => { setRenameOpen(true); setPopoverOpen(false) }}
                        />
                        <ButtonInPopover
                            text="Cambia colore"
                            type="color"
                            onClick={() => { setColorOpen(!isColorOpen) }}
                        />
                        <ButtonInPopover
                            text="Colora contenuto"
                            type="colorContent"
                            onClick={() => { handleColorContent(); setPopoverOpen(false) }}
                        />
                        <Separator />
                        <ButtonInPopover
                            text="Elimina"
                            type="delete"
                            destructive
                            onClick={() => { setDeleteFolderOpen(true); setPopoverOpen(false) }}
                        />
                    </div>
                    <DialogAddColor
                        item={folder}
                        itemType="folder"
                        isOpen={isColorOpen}
                        onOpenChange={setColorOpen}
                        addColorItem={updateItemColor}
                        getItemId={currentWorkspace?.id}
                        getItemData={getWorkspaceData}
                    />
                </PopoverContent>
            </Popover>

            <DialogAddSubFolder
                parentFolder={folder}
                isOpen={isAddSubFolderOpen}
                onOpenChange={setAddSubFolderOpen}
            />
            <DialogAddNote
                parentFolder={folder}
                isOpen={isAddNoteOpen}
                onOpenChange={setAddNoteOpen}
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