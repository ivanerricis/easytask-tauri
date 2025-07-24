import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { EllipsisVertical } from "lucide-react"
import type { Task } from "@/types/types"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import { toast } from "sonner"
import { useState } from "react"
import { ButtonInPopover } from "@/components/button-in-popover"
import { Separator } from "@/components/ui/separator"
import { DialogDeleteItem } from "@/components/dialogs/dialog-delete"
import { DialogAddColor } from "@/components/dialogs/dialog-add-color"

type ButtonMenuFolderProps = {
    task: Task
}

export const ButtonMenuTask = ({ task }: ButtonMenuFolderProps) => {
    const [popoverOpen, setPopoverOpen] = useState(false)
    const [isColorOpen, setColorOpen] = useState(false)
    const [isDeleteTaskOpen, setDeleteTaskOpen] = useState(false)
    const { updateTaskPriority, getNoteData, updateItemColor, currentNote } = useWorkspaceData()

    const handleEditPriority = async () => {
        try {
            await updateTaskPriority(task.id, !task.priority)
            if (currentNote)
                await getNoteData(currentNote.id)
        } catch (error: any) {
            toast.error('Impossibile modificare la priorità')
        } finally {
            setPopoverOpen(false)
        }
    }

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
                            text="Cambia colore"
                            type="color"
                            onClick={() => { setColorOpen(!isColorOpen) }}
                        />
                        <ButtonInPopover
                            text={task.priority ? 'Rimuovi priorità' : 'Aggiungi priorità'}
                            type={task.priority ? 'removePriority' : 'addPriority'}
                            onClick={() => { handleEditPriority(); setPopoverOpen(false) }}
                        />
                        <Separator />
                        <ButtonInPopover
                            text="Elimina"
                            type="delete"
                            destructive
                            onClick={() => { setDeleteTaskOpen(true); setPopoverOpen(false) }}
                        />
                    </div>
                    <DialogAddColor
                        item={task}
                        itemType="task"
                        isOpen={isColorOpen}
                        onOpenChange={setColorOpen}
                        addColorItem={updateItemColor}
                        getItemId={currentNote?.id}
                        getItemData={getNoteData}
                    />
                </PopoverContent>
            </Popover>

            <DialogDeleteItem
                item={task}
                itemType="task"
                isOpen={isDeleteTaskOpen}
                onOpenChange={setDeleteTaskOpen}
                getItemId={currentNote?.id}
                getItemData={getNoteData}
            />
        </>
    )
}