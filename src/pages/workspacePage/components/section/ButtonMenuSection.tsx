import { EllipsisVertical } from "lucide-react"
import { useState } from "react"
import { ButtonInPopover } from "@/components/button-in-popover"
import { DialogAddColor } from "@/components/dialogs/dialog-add-color"
import type { Section } from "@/types/types"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import { Separator } from "@/components/ui/separator"
import { DialogDeleteItem } from "@/components/dialogs/dialog-delete"
import { DialogRenameItem } from "@/components/dialogs/dialog-rename"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

type ButtonMenuSectionProps = {
    section: Section
}

export const ButtonMenuSection = ({ section }: ButtonMenuSectionProps) => {
    const [isRenameOpen, setRenameOpen] = useState(false)
    const [isDeleteOpen, setDeleteOpen] = useState(false)
    const [dropDownOpen, setDropDownOpen] = useState(false)
    const { updateItemColor, getNoteData, currentNote } = useWorkspaceData()

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
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                                <ButtonInPopover
                                    text="Cambia colore"
                                    type="color"
                                />
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                                <DialogAddColor
                                    item={section}
                                    itemType="section"
                                    addColorItem={updateItemColor}
                                    getItemId={currentNote?.id}
                                    getItemData={getNoteData}
                                    setDropDownOpen={setDropDownOpen}
                                />
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <Separator />
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
                item={section}
                itemType="section"
                isOpen={isRenameOpen}
                onOpenChange={setRenameOpen}
                getItemId={currentNote?.id}
                getItemData={getNoteData}
            />
            <DialogDeleteItem
                item={section}
                itemType="section"
                isOpen={isDeleteOpen}
                onOpenChange={setDeleteOpen}
                getItemId={currentNote?.id}
                getItemData={getNoteData}
            />
        </>
    )
}