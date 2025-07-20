import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { Folder } from "@/types/types"
import { EllipsisVertical } from "lucide-react"
import { DialogAddSubFolder } from "./DialogAddSubFolder"
import { DialogAddNote } from "./DialogAddNote"
import { DialogDeleteFolder } from "./DialogDeleteFolder"
import { DialogEditFolder } from "./DialogEditFolder"
import { useState } from "react"
import { ButtonInPopover } from "@/components/button-in-popover"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import { useWorkspace } from "@/contexts/workspace-context"

type ButtonMenuFolderProps = {
    folder: Folder
}

export const ButtonMenuFolder = ({ folder }: ButtonMenuFolderProps) => {
    const [isAddSubFolderOpen, setAddSubFolderOpen] = useState(false);
    const [isAddNoteOpen, setAddNoteOpen] = useState(false);
    const [isEditFolderOpen, setEditFolderOpen] = useState(false);
    const [isDeleteFolderOpen, setDeleteFolderOpen] = useState(false);
    const [popoverOpen, setPopoverOpen] = useState(false);
    const { updateFolderColorContent, getWorkspaceData } = useWorkspaceData()
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

    const closeAll = () => {
        setPopoverOpen(false);
    }

    return (
        <>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                    <button onClick={(e) => e.stopPropagation()} className="p-1 rounded-xs cursor-pointer">
                        <EllipsisVertical className="!h-4 !w-4" />
                    </button>
                </PopoverTrigger>
                <PopoverContent
                    onClick={(e) => { e.stopPropagation() }}
                    className="flex flex-col justify-center gap-1 w-auto p-1"
                >
                    <ButtonInPopover text="Aggiungi cartella" onClick={() => { setAddSubFolderOpen(true); closeAll() }} />
                    <ButtonInPopover text="Aggiungi nota" onClick={() => { setAddNoteOpen(true); closeAll() }} />
                    <ButtonInPopover text="Modifica cartella" onClick={() => { setEditFolderOpen(true); closeAll() }} />
                    <Button onClick={handleColorContent} size={"sm"} variant={"ghost"} className="text-sm rounded-xs justify-start">
                        Colora contenuto
                    </Button>
                    <ButtonInPopover text="Elimina" destructive onClick={() => { setDeleteFolderOpen(true); closeAll() }} />
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
            <DialogEditFolder
                folder={folder}
                isOpen={isEditFolderOpen}
                onOpenChange={setEditFolderOpen}
            />
            <DialogDeleteFolder
                folderId={folder?.id}
                isOpen={isDeleteFolderOpen}
                onOpenChange={setDeleteFolderOpen}
            />
        </>
    )
}