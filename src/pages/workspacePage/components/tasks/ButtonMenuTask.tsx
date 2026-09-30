import { EllipsisVertical } from "lucide-react"
import { getErrorMessage } from "@/lib/utils"
import type { Task } from "@/types/types"
import { useWorkspaceActions } from "@/contexts/workspace-data-context"
import { useActiveNoteId } from "@/contexts/tabs-context"
import { useActiveNoteActions } from "@/contexts/active-note-context"
import { toast } from "sonner"
import { useRef, useState } from "react"
import { ButtonInPopover } from "@/components/button-in-popover"
import { Separator } from "@/components/ui/separator"
import { DialogDeleteItem } from "@/components/dialogs/dialog-delete"
import { DialogAddColor } from "@/components/dialogs/dialog-add-color"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { DialogTaskDescription } from "./DialogTaskDescription"
import { TaskMoveSubmenu } from "../NoteMoveSubmenus"

type ButtonMenuFolderProps = {
    task: Task
    onAddSubtask?: () => void
}

export const ButtonMenuTask = ({ task, onAddSubtask }: ButtonMenuFolderProps) => {
    // The inline input is opened once the menu has given the focus back, otherwise the input would lose it
    const addSubtaskRequested = useRef(false)
    const [dropDownOpen, setDropDownOpen] = useState(false)
    const [isDescriptionOpen, setDescriptionOpen] = useState(false)
    const [isDeleteTaskOpen, setDeleteTaskOpen] = useState(false)
    const { updateTaskPriority, updateTaskDescription, updateItemColor } = useWorkspaceActions()
    const activeId = useActiveNoteId()
    const { getNoteData, refreshActiveNote, patchTask } = useActiveNoteActions()

    const handleEditPriority = async () => {
        // Optimistic: the cached tree is updated at once and restored if the write fails
        const rollback = patchTask(task.id, { priority: !task.priority })
        try {
            await updateTaskPriority(task.id, !task.priority)
        } catch {
            rollback()
            toast.error('Impossibile modificare la priorità')
        } finally {
            setDropDownOpen(false)
        }
    }

    const handleDescription = async () => {
        if (task.description) {
            try {
                await updateTaskDescription(task.id, undefined)
                await refreshActiveNote()
            } catch (err) {
                toast.error(getErrorMessage(err))
            } finally {
                setDropDownOpen(false)
            }
        }
        else {
            setDropDownOpen(false)
            setDescriptionOpen(true)
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
                    onCloseAutoFocus={(e) => {
                        if (!addSubtaskRequested.current) return
                        e.preventDefault()
                        addSubtaskRequested.current = false
                        onAddSubtask?.()
                    }}
                >
                    <DropdownMenuGroup className="flex flex-col gap-1">
                        <ButtonInPopover
                            text="Aggiungi sottotask"
                            type="addSubtask"
                            onClick={() => { addSubtaskRequested.current = true; setDropDownOpen(false) }}
                        />
                        <ButtonInPopover
                            text={task.description ? 'Rimuovi descrizione' : 'Aggiungi descrizione'}
                            type={task.description ? 'removeDescription' : 'addDescription'}
                            onClick={() => { handleDescription() }}
                        />
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
                                    getItemId={activeId ?? undefined}
                                    getItemData={getNoteData}
                                    setDropDownOpen={setDropDownOpen}
                                />
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <TaskMoveSubmenu taskId={task.id} onDone={() => setDropDownOpen(false)} />
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

            <DialogTaskDescription
                task={task}
                open={isDescriptionOpen}
                onOpenChange={setDescriptionOpen}
            />

            <DialogDeleteItem
                item={task}
                itemType="task"
                isOpen={isDeleteTaskOpen}
                onOpenChange={setDeleteTaskOpen}
                getItemId={activeId ?? undefined}
                getItemData={getNoteData}
            />
        </>
    )
}