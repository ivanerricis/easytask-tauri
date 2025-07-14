import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { EllipsisVertical } from "lucide-react"
import { DialogDeleteTask } from "./dialogs/DialogDeleteTask"

type ButtonMenuFolderProps = {
    taskId: number
}

export const ButtonMenuTask = ({ taskId }: ButtonMenuFolderProps) => {

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button onClick={(e) => e.stopPropagation()} className="p-1 rounded-xs cursor-pointer">
                    <EllipsisVertical className="!h-4 !w-4" />
                </button>
            </PopoverTrigger>
            <PopoverContent className="flex flex-col justify-center gap-1 w-auto p-1 rounded-xs">
                <DialogDeleteTask taskId={taskId}/>
            </PopoverContent>
        </Popover>
    )
}