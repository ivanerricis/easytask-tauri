import { ButtonInPopover } from "@/components/button-in-popover";
import { DialogRenameItem } from "@/components/dialogs/dialog-rename";
import { DialogDeleteItem } from "@/components/dialogs/dialog-delete";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useActiveNoteId } from "@/contexts/tabs-context";
import { useActiveNoteActions } from "@/contexts/active-note-context";
import { useAudio } from "@/contexts/audio-context";
import type { Group } from "@/types/types";
import { EllipsisVertical } from "lucide-react";
import { useState } from "react";

type Props = {
    group: Group
}

export const ButtonMenuGroup = ({ group }: Props) => {
    const [isRenameOpen, setRenameOpen] = useState(false)
    const [isDeleteOpen, setDeleteOpen] = useState(false)
    const [dropDownOpen, setDropDownOpen] = useState(false)
    const activeId = useActiveNoteId()
    const { getNoteData } = useActiveNoteActions()
    const { addFiles } = useAudio()

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
                            text="Rinomina"
                            type="rename"
                            onClick={() => {
                                setRenameOpen(true)
                                setDropDownOpen(false)
                            }}
                        />
                        <ButtonInPopover
                            text="Aggiungi file audio"
                            type="addAudio"
                            onClick={() => {
                                setDropDownOpen(false)
                                void addFiles(group.id)
                            }}
                        />
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

            <DialogRenameItem
                key={group.name ?? ""}
                item={group}
                itemType="section_group"
                isOpen={isRenameOpen}
                onOpenChange={setRenameOpen}
                getItemId={activeId ?? undefined}
                getItemData={getNoteData}
            />
            <DialogDeleteItem
                item={group}
                itemType="section_group"
                isOpen={isDeleteOpen}
                onOpenChange={setDeleteOpen}
                getItemId={activeId ?? undefined}
                getItemData={getNoteData}
            />
        </>
    );
}