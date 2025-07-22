import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { EllipsisVertical } from "lucide-react"
import { DialogDeleteSection } from "./dialogs/DialogDeleteSection"
import { useState } from "react"
import { ButtonInPopover } from "@/components/button-in-popover"
import { DialogAddColor } from "./dialogs/DialogAddColor"
import type { Section } from "@/types/types"
import { useWorkspaceData } from "@/contexts/workspace-data-context"

type ButtonMenuFolderProps = {
    section: Section
}

export const ButtonMenuSection = ({ section }: ButtonMenuFolderProps) => {
    const [isDeleteSectionOpen, setDeleteSectionOpen] = useState(false)
    const [isColorSectionOpen, setColorSectionOpen] = useState(false)
    const [popoverOpen, setPopoverOpen] = useState(false)
    const { updateItemColor, getNoteData, currentNote } = useWorkspaceData()

    const closeAll = () => {
        setPopoverOpen(false)
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
                    className="flex flex-col justify-center gap-1 w-auto p-1 rounded-xs"
                >
                    <ButtonInPopover text="Cambia colore" onClick={() => { setColorSectionOpen(true), closeAll() }} />
                    <ButtonInPopover text="Elimina" destructive onClick={() => { setDeleteSectionOpen(true), closeAll() }} />
                </PopoverContent>
            </Popover>

            <DialogAddColor
                item={section}
                itemType='section'
                isOpen={isColorSectionOpen}
                onOpenChange={setColorSectionOpen}
                addColorItem={updateItemColor}
                getItemId={currentNote?.id}
                getItemData={getNoteData}
            />

            <DialogDeleteSection
                sectionId={section.id}
                isOpen={isDeleteSectionOpen}
                onOpenChange={setDeleteSectionOpen}
            />
        </>
    )
}