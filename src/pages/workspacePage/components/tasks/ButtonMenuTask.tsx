import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { EllipsisVertical } from "lucide-react"
import { DialogDeleteTask } from "./dialogs/DialogDeleteTask"
import type { Task } from "@/types"
import { Button } from "@/components/ui/button"
import type React from "react"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import { toast } from "sonner"
import { useState } from "react"

type ButtonMenuFolderProps = {
    task: Task
}

export const ButtonMenuTask = ({ task }: ButtonMenuFolderProps) => {
    const [open, setOpen] = useState(false)
    const { editTaskPriority, getNoteData, currentNote } = useWorkspaceData()

    const handleEditPriority = async (e: React.MouseEvent) => {
        e.stopPropagation()
        try {
            await editTaskPriority(task.id, !task.priority)
            if (currentNote)
                await getNoteData(currentNote.id)
        } catch (error: any) {
            toast.error('Impossibile modificare la priorità')
        } finally {
            setOpen(false)
        }
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button onClick={(e) => e.stopPropagation()} className="rounded-xs cursor-pointer">
                    <EllipsisVertical className="!h-4 !w-4" />
                </button>
            </PopoverTrigger>
            <PopoverContent className="flex flex-col justify-center gap-1 w-auto p-1 rounded-xs">
                <Button
                    onClick={handleEditPriority}
                    size={"sm"}
                    variant={"ghost"}
                    className="text-xs rounded-xs justify-start">
                    {task.priority ? 'Rimuovi priorità' : 'Aggiungi priorità'}
                </Button>
                <DialogDeleteTask taskId={task.id} />
            </PopoverContent>
        </Popover>
    )
}