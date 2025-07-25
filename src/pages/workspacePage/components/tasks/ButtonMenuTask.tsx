import { EllipsisVertical } from "lucide-react"
import type { Task } from "@/types/types"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import { toast } from "sonner"
import { useState } from "react"
import { ButtonInPopover } from "@/components/button-in-popover"
import { Separator } from "@/components/ui/separator"
import { DialogDeleteItem } from "@/components/dialogs/dialog-delete"
import { DialogAddColor } from "@/components/dialogs/dialog-add-color"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

type ButtonMenuFolderProps = {
    task: Task
}

export const ButtonMenuTask = ({ task }: ButtonMenuFolderProps) => {
    const [dropDownOpen, setDropDownOpen] = useState(false)
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
            setDropDownOpen(false)
        }
    }

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
                            text={task.priority ? 'Rimuovi priorità' : 'Aggiungi priorità'}
                            type={task.priority ? 'removePriority' : 'addPriority'}
                            onClick={() => { handleEditPriority(); setDropDownOpen(false) }}
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
                                    item={task}
                                    itemType="task"
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
                            onClick={() => { setDeleteTaskOpen(true); setDropDownOpen(false) }}
                        />
                    </DropdownMenuGroup>
                </DropdownMenuContent>
            </DropdownMenu>

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