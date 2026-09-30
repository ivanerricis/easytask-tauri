import { getErrorMessage } from "@/lib/utils"
import type { Task } from "@/types/types"
import { useWorkspaceActions } from "@/contexts/workspace-data-context"
import { useActiveNoteId } from "@/contexts/tabs-context"
import { useActiveNoteActions } from "@/contexts/active-note-context"
import { toast } from "sonner"
import { useRef, useState, type ReactElement } from "react"
import { ButtonInPopover } from "@/components/button-in-popover"
import { Separator } from "@/components/ui/separator"
import { DialogDeleteItem } from "@/components/dialogs/dialog-delete"
import { DialogAddColor } from "@/components/dialogs/dialog-add-color"
import { MenuGroup, MenuSub, MenuSubContent, MenuSubTrigger } from "@/components/menu-kind"
import { ItemMenu } from "@/components/item-menu"
import { useItemMenuState } from "@/hooks/use-item-menu-state"
import { DialogTaskDescription } from "./DialogTaskDescription"
import { TaskMoveSubmenu } from "../NoteMoveSubmenus"

type ButtonMenuFolderProps = {
    task: Task
    onAddSubtask?: () => void
    /** The task row: right click on it opens this menu, its <ItemMenuButton /> opens it below the button. */
    children: ReactElement
}

export const ButtonMenuTask = ({ task, onAddSubtask, children }: ButtonMenuFolderProps) => {
    // The inline input is opened once the menu has given the focus back, otherwise the input would lose it
    const addSubtaskRequested = useRef(false)
    const menu = useItemMenuState()
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
            menu.close()
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
                menu.close()
            }
        }
        else {
            menu.close()
            setDescriptionOpen(true)
        }
    }

    const items = (
        <MenuGroup className="flex flex-col gap-1">
            <ButtonInPopover
                text="Aggiungi sottotask"
                type="addSubtask"
                onClick={() => { addSubtaskRequested.current = true; menu.close() }}
            />
            <ButtonInPopover
                text={task.description ? 'Rimuovi descrizione' : 'Aggiungi descrizione'}
                type={task.description ? 'removeDescription' : 'addDescription'}
                onClick={() => { handleDescription() }}
            />
            <ButtonInPopover
                text={task.priority ? 'Rimuovi priorità' : 'Aggiungi priorità'}
                type={task.priority ? 'removePriority' : 'addPriority'}
                onClick={() => { handleEditPriority(); menu.close() }}
            />
            <MenuSub>
                <MenuSubTrigger>
                    <ButtonInPopover
                        text="Cambia colore"
                        type="color"
                    />
                </MenuSubTrigger>
                <MenuSubContent>
                    <DialogAddColor
                        item={task}
                        itemType="task"
                        addColorItem={updateItemColor}
                        getItemId={activeId ?? undefined}
                        getItemData={getNoteData}
                        setDropDownOpen={menu.close}
                    />
                </MenuSubContent>
            </MenuSub>
            <TaskMoveSubmenu taskId={task.id} onDone={menu.close} />
            <Separator />
            <ButtonInPopover
                text="Elimina"
                type="delete"
                destructive
                onClick={() => { setDeleteTaskOpen(true); menu.close() }}
            />
        </MenuGroup>
    )

    const dialogs = (
        <>
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

    return (
        <ItemMenu
            state={menu}
            items={items}
            dialogs={dialogs}
            contentClassName="p-1 rounded-xs"
            onCloseAutoFocus={(e) => {
                if (!addSubtaskRequested.current) return
                e.preventDefault()
                addSubtaskRequested.current = false
                onAddSubtask?.()
            }}
        >
            {children}
        </ItemMenu>
    )
}
