import { useState } from "react";
import { EllipsisVertical } from "lucide-react";
import type { Workspace } from "@/types/types";
import { ButtonInPopover } from "@/components/button-in-popover";
import { DialogRenameItem } from "@/components/dialogs/dialog-rename";
import { DialogDeleteItem } from "@/components/dialogs/dialog-delete";
import { DialogAddColor } from "@/components/dialogs/dialog-add-color";
import { useWorkspace } from "@/contexts/workspace-context";
import { useWorkspaceData } from "@/contexts/workspace-data-context";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

type ButtonMenuProps = {
    workspace: Workspace
};

export const ButtonMenuWorkspace = ({ workspace }: ButtonMenuProps) => {
    const [isRenameOpen, setRenameOpen] = useState(false);
    const [isDeleteOpen, setDeleteOpen] = useState(false);
    const [dropDownOpen, setDropDownOpen] = useState(false);

    const { getWorkspaces } = useWorkspace();
    const { updateItemColor } = useWorkspaceData();

    return (
        <>
            <DropdownMenu open={dropDownOpen} onOpenChange={setDropDownOpen}>
                <DropdownMenuTrigger asChild>
                    <div
                        role="button"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 rounded-xs cursor-pointer hover:bg-accent"
                    >
                        <EllipsisVertical className="size-4" />
                    </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 rounded-xs"
                >
                    <DropdownMenuGroup className="flex flex-col gap-1">
                        <ButtonInPopover
                            text="Rinomina"
                            type="rename"
                            onClick={() => {
                                setRenameOpen(true);
                                setDropDownOpen(false);
                            }}
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
                                    item={workspace}
                                    itemType="workspace"
                                    addColorItem={updateItemColor}
                                    getItemId={workspace.id}
                                    getItemData={getWorkspaces}
                                    setDropDownOpen={setDropDownOpen}
                                />
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuSeparator />
                        <ButtonInPopover
                            text="Elimina"
                            type="delete"
                            destructive
                            onClick={() => {
                                setDeleteOpen(true);
                                setDropDownOpen(false);
                            }}
                        />
                    </DropdownMenuGroup>
                </DropdownMenuContent>
            </DropdownMenu>

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
    );
};
