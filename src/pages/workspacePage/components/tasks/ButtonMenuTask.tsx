import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { EllipsisVertical } from "lucide-react"
import { DialogDeleteTask } from "./dialogs/DialogDeleteTask"
import type { Task } from "@/types/types"
import { Button } from "@/components/ui/button"
import type React from "react"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import { toast } from "sonner"
import { useState } from "react"
import { ButtonInPopover } from "@/components/button-in-popover"

type ButtonMenuFolderProps = {
    task: Task
    onChangeColor: () => void
}

export const ButtonMenuTask = ({ task, onChangeColor }: ButtonMenuFolderProps) => {
    const [popoverOpen, setPopoverOpen] = useState(false)
    const [isDeleteTaskOpen, setDeleteTaskOpen] = useState(false)
    const { editTaskPriority, getNoteData, currentNote } = useWorkspaceData()

    const closeAll = () => {
        setPopoverOpen(false)
    }

    const handleEditPriority = async (e: React.MouseEvent) => {
        e.stopPropagation()
        try {
            await editTaskPriority(task.id, !task.priority)
            if (currentNote)
                await getNoteData(currentNote.id)
        } catch (error: any) {
            toast.error('Impossibile modificare la priorità')
        } finally {
            closeAll()
        }
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
                    <ButtonInPopover text="Cambia colore" onClick={() => { onChangeColor(), closeAll() }} />
                    <Button
                        onClick={handleEditPriority}
                        size={"sm"}
                        variant={"ghost"}
                        className="text-xs rounded-xs justify-start">
                        {task.priority ? 'Rimuovi priorità' : 'Aggiungi priorità'}
                    </Button>
                    <ButtonInPopover text="Elimina" destructive onClick={() => { setDeleteTaskOpen(true); closeAll() }} />
                </PopoverContent>
            </Popover>

            <DialogDeleteTask
                taskId={task.id}
                isOpen={isDeleteTaskOpen}
                onOpenChange={setDeleteTaskOpen}
            />
        </>
    )
}