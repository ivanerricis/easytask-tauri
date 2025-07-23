import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { EllipsisVertical } from "lucide-react"
import { useState } from "react"
import { ButtonInPopover } from "@/components/button-in-popover"
import { DialogAddColor } from "../../../../components/dialogs/dialog-add-color"
import type { Section } from "@/types/types"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import { Separator } from "@/components/ui/separator"
import { DialogDeleteItem } from "@/components/dialogs/dialog-delete"
import { DialogRenameItem } from "@/components/dialogs/dialog-rename"

type ButtonMenuFolderProps = {
    section: Section
}

export const ButtonMenuSection = ({ section }: ButtonMenuFolderProps) => {
    const [isRenameOpen, setRenameOpen] = useState(false)
    const [isDeleteOpen, setDeleteOpen] = useState(false)
    const [isColorOpen, setColorOpen] = useState(false)
    const [popoverOpen, setPopoverOpen] = useState(false)
    const { updateItemColor, getNoteData, currentNote } = useWorkspaceData()

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
                    className="relative flex w-auto p-0 rounded-xs gap-1 bg-transparent border-none"
                >
                    <div className="flex flex-col gap-1 p-1 border bg-background">
                        <ButtonInPopover
                            text="Rinomina"
                            type="rename"
                            onClick={() => { setRenameOpen(true), setPopoverOpen(false) }}
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
                            onClick={() => { setDeleteOpen(true), setPopoverOpen(false) }}
                        />
                    </div>
                    <DialogAddColor
                        item={section}
                        itemType="section"
                        isOpen={isColorOpen}
                        onOpenChange={setColorOpen}
                        addColorItem={updateItemColor}
                        getItemId={currentNote?.id}
                        getItemData={getNoteData}
                    />
                </PopoverContent>
            </Popover>

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