import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { EllipsisVertical } from "lucide-react"
import { DialogDeleteSection } from "./dialogs/DialogDeleteSection"

type ButtonMenuFolderProps = {
    sectionId: number
}

export const ButtonMenuSection = ({ sectionId }: ButtonMenuFolderProps) => {

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button onClick={(e) => e.stopPropagation()} className="p-1 rounded-xs cursor-pointer">
                    <EllipsisVertical className="!h-4 !w-4" />
                </button>
            </PopoverTrigger>
            <PopoverContent className="flex flex-col justify-center gap-1 w-auto p-1 rounded-xs">
                <DialogDeleteSection sectionId={sectionId} />
            </PopoverContent>
        </Popover>
    )
}