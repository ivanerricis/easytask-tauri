import { useState } from "react";
import { EllipsisVertical } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Workspace } from "@/types/types";
import { ButtonInPopover } from "@/components/button-in-popover";
import { Separator } from "@/components/ui/separator";
import { DialogRenameItem } from "@/components/dialogs/dialog-rename";
import { useWorkspace } from "@/contexts/workspace-context";
import { DialogDeleteItem } from "@/components/dialogs/dialog-delete";
import { DialogAddColor } from "@/components/dialogs/dialog-add-color";
import { useWorkspaceData } from "@/contexts/workspace-data-context";

type ButtonMenuProps = {
    workspace: Workspace
}

export const ButtonMenuWorkspace = ({ workspace }: ButtonMenuProps) => {
    const [isRenameOpen, setRenameOpen] = useState(false);
    const [isColorOpen, setColorOpen] = useState(false);
    const [isDeleteOpen, setDeleteOpen] = useState(false);
    const [popoverOpen, setPopoverOpen] = useState(false);
    const { getWorkspaces } = useWorkspace()
    const { updateItemColor } = useWorkspaceData()

    return (
        <>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                    <div
                        role="button"
                        onClick={(e) => { e.stopPropagation() }}
                        className="flex items-center justify-center right-1 top-1 absolute opacity-0 cursor-pointer group-hover:opacity-100 hover:bg-background rounded-xs p-1">
                        <EllipsisVertical className="flex items-center justify-center w-5 h-5" />
                    </div>
                </PopoverTrigger>
                <PopoverContent
                    onClick={(e) => { e.stopPropagation() }}
                    className="relative flex w-auto p-0 rounded-xs gap-1 bg-transparent border-none"
                >
                    <div
                        className="flex flex-col gap-1 p-1 max-h-max border bg-background">
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
                        <Separator />
                        <ButtonInPopover
                            text="Elimina"
                            type="delete"
                            destructive
                            onClick={() => { setDeleteOpen(true); setPopoverOpen(false) }}
                        />
                    </div>
                    <DialogAddColor
                        item={workspace}
                        itemType="workspace"
                        isOpen={isColorOpen}
                        onOpenChange={setColorOpen}
                        addColorItem={updateItemColor}
                        getItemId={workspace.id}
                        getItemData={getWorkspaces}
                    />
                </PopoverContent>
            </Popover >

            <DialogRenameItem
                item={workspace}
                itemType="workspace"
                isOpen={isRenameOpen}
                onOpenChange={setRenameOpen}
                getItemData={getWorkspaces}
                getItemId={workspace.id}
            />
            <DialogDeleteItem
                item={workspace}
                itemType="workspace"
                isOpen={isDeleteOpen}
                onOpenChange={setDeleteOpen}
                getItemData={getWorkspaces}
            />
        </>
    )
}
