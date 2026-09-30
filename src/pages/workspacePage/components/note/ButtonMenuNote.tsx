import { EllipsisVertical } from "lucide-react"
import { useState } from "react"
import type { Note } from "@/types/types"
import { useWorkspaceActions } from "@/contexts/workspace-data-context"
import { useTabsActions } from "@/contexts/tabs-context"
import { ButtonInPopover } from "@/components/button-in-popover"
import { DialogRenameItem } from "@/components/dialogs/dialog-rename"
import { useWorkspace } from "@/contexts/workspace-context"
import { DialogDeleteItem } from "@/components/dialogs/dialog-delete"
import { Separator } from "@/components/ui/separator"
import { DialogAddColor } from "@/components/dialogs/dialog-add-color"
import { MoveToSubmenu } from "../MoveToSubmenu"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

type ButtonMenuNoteProps = {
    note: Note
}

export const ButtonMenuNote = ({ note }: ButtonMenuNoteProps) => {
    const [isRenameOpen, setRenameOpen] = useState(false);
    const [isDeleteOpen, setDeleteOpen] = useState(false);
    const [dropDownOpen, setDropDownOpen] = useState(false);
    const { currentWorkspace } = useWorkspace()
    const { getWorkspaceData, updateItemColor } = useWorkspaceActions()
    const { openNote } = useTabsActions()

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
                    className="p-1 rounded-xs"
                >
                    <DropdownMenuGroup className="flex flex-col gap-1">
                        <ButtonInPopover
                            text="Apri"
                            type="open"
                            onClick={() => { openNote(note.id); setDropDownOpen(false) }}
                        />
                        <ButtonInPopover
                            text="Rinomina"
                            type="rename"
                            onClick={() => { setRenameOpen(true); setDropDownOpen(false) }}
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
                                    item={note}
                                    itemType="note"
                                    addColorItem={updateItemColor}
                                    getItemId={currentWorkspace?.id}
                                    getItemData={getWorkspaceData}
                                    setDropDownOpen={setDropDownOpen}
                                />
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <MoveToSubmenu
                            itemType="note"
                            itemId={note.id}
                            folderID={note.folderID}
                            onDone={() => setDropDownOpen(false)}
                        />
                        <Separator />
                        <ButtonInPopover
                            text="Elimina"
                            type="delete"
                            destructive
                            onClick={() => { setDeleteOpen(true); setDropDownOpen(false) }}
                        />
                    </DropdownMenuGroup>
                </DropdownMenuContent>
            </DropdownMenu>

            <DialogRenameItem
                item={note}
                itemType="note"
                isOpen={isRenameOpen}
                onOpenChange={setRenameOpen}
                getItemId={currentWorkspace?.id}
                getItemData={getWorkspaceData}
            />
            <DialogDeleteItem
                item={note}
                itemType="note"
                isOpen={isDeleteOpen}
                onOpenChange={setDeleteOpen}
                getItemId={currentWorkspace?.id}
                getItemData={getWorkspaceData}
            />
        </>
    )
}