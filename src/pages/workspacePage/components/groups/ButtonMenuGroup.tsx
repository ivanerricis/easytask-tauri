import { ButtonInPopover } from "@/components/button-in-popover";
import { DialogDeleteItem } from "@/components/dialogs/dialog-delete";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useWorkspaceData } from "@/contexts/workspace-data-context";
import type { Group } from "@/types/types";
import { EllipsisVertical } from "lucide-react";
import { useState } from "react";

type Props = {
    group: Group
}

export const ButtonMenuGroup = ({ group }: Props) => {
    const [isDeleteOpen, setDeleteOpen] = useState(false)
    const [dropDownOpen, setDropDownOpen] = useState(false)
    const { currentNote, getNoteData } = useWorkspaceData()

    return (
        <>
            <DropdownMenu open={dropDownOpen} onOpenChange={setDropDownOpen}>
                <DropdownMenuTrigger asChild>
                    <div onClick={(e) => e.stopPropagation()} className="p-1 rounded-xs cursor-pointer">
                        <EllipsisVertical className="!h-4 !w-4" />
                    </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 rounded-xs"
                >
                    <DropdownMenuGroup className="flex flex-col gap-1">
                        <ButtonInPopover
                            text="Elimina"
                            type="delete"
                            destructive
                            onClick={() => {
                                setDeleteOpen(true)
                                setDropDownOpen(false)
                            }}
                        />
                    </DropdownMenuGroup>
                </DropdownMenuContent>
            </DropdownMenu>

            <DialogDeleteItem
                item={group}
                itemType="section_group"
                isOpen={isDeleteOpen}
                onOpenChange={setDeleteOpen}
                getItemId={currentNote?.id}
                getItemData={getNoteData}
            />
        </>
    );
}