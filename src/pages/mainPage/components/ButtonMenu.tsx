import { useState } from "react";
import { EllipsisVertical } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DialogEditWorkspace } from "./DialogEditWorkspace";
import { DialogDeleteWorkspace } from "./DialogDeleteWorkspace";
import type { Workspace } from "@/types";
import { ButtonInPopover } from "@/components/button-in-popover";

type ButtonMenuProps = {
    workspace: Workspace
}

export const ButtonMenu = ({ workspace }: ButtonMenuProps) => {
    const [isEditWorkspaceOpen, setEditWorkspaceOpen] = useState(false);
    const [isDeleteWorkspaceOpen, setDeleteWorkspaceOpen] = useState(false);
    const [popoverOpen, setPopoverOpen] = useState(false);

    const closeAll = () => {
        setPopoverOpen(false);
    }

    return (
        <>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                    <div onClick={(e) => { e.stopPropagation() }} className="flex items-center justify-center right-1 top-1 absolute opacity-0 cursor-pointer group-hover:opacity-100 hover:bg-background rounded-xs p-1">
                        <EllipsisVertical className="flex items-center justify-center w-5 h-5" />
                    </div>
                </PopoverTrigger>
                <PopoverContent className="flex flex-col w-auto p-1 rounded-xs">
                    <ButtonInPopover text="Modifica" onClick={() => { setEditWorkspaceOpen(true); closeAll() }} />
                    <ButtonInPopover text="Elimina" destructive onClick={() => { setDeleteWorkspaceOpen(true); closeAll() }} />
                </PopoverContent>
            </Popover >

            <DialogEditWorkspace
                workspace={workspace}
                isOpen={isEditWorkspaceOpen}
                onOpenChange={setEditWorkspaceOpen}
            />
            <DialogDeleteWorkspace
                workspaceId={workspace.id}
                isOpen={isDeleteWorkspaceOpen}
                onOpenChange={setDeleteWorkspaceOpen}
            />
        </>
    )
}
