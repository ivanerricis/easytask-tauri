import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { Folder } from "@/types"
import { EllipsisVertical } from "lucide-react"
import { DialogAddSubFolder } from "../dialogs/DialogAddSubFolder"
import { DialogAddNote } from "../dialogs/DialogAddNote"
import { DialogDeleteFolder } from "../dialogs/DialogDeleteFolder"
import { DialogEditFolder } from "../dialogs/DialogEditFolder"

type ButtonMenuFolderProps = {
    folder: Folder
}

export const ButtonMenuFolder = ({ folder }: ButtonMenuFolderProps) => {

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button onClick={(e) => e.stopPropagation()} className="p-1 rounded-xs cursor-pointer">
                    <EllipsisVertical className="!h-4 !w-4" />
                </button>
            </PopoverTrigger>
            <PopoverContent className="flex flex-col justify-center gap-1 w-auto p-1">
                <DialogAddSubFolder parentFolder={folder} />
                <DialogAddNote parentFolder={folder} />
                <DialogEditFolder folder={folder} />
                <DialogDeleteFolder folderId={folder?.id} />
            </PopoverContent>
        </Popover>
    )
}