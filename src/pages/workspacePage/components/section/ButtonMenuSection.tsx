import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { EllipsisVertical } from "lucide-react"
import { DialogDeleteSection } from "./dialogs/DialogDeleteSection"
import { useState } from "react"
import { ButtonInPopover } from "@/components/button-in-popover"

type ButtonMenuFolderProps = {
    sectionId: number
}

export const ButtonMenuSection = ({ sectionId }: ButtonMenuFolderProps) => {
    const [isDeleteSectionOpen, setDeleteSectionOpen] = useState(false)
    const [popoverOpen, setPopoverOpen] = useState(false)

    const closAll = () => {
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
                <PopoverContent className="flex flex-col justify-center gap-1 w-auto p-1 rounded-xs">
                    <ButtonInPopover text="Elimina" destructive onClick={() => { setDeleteSectionOpen(true), closAll() }} />
                </PopoverContent>
            </Popover>

            <DialogDeleteSection
                sectionId={sectionId}
                isOpen={isDeleteSectionOpen}
                onOpenChange={setDeleteSectionOpen}
            />
        </>
    )
}