import { useTranslation } from "react-i18next"
import { getErrorMessage } from "@/lib/utils"
import type { DBItemType } from "@/db/queries/shared_queries"
import type { Task } from "@/types/types"
import { useWorkspaceActions } from "@/contexts/workspace-data"
import { useActiveNoteActions } from "@/contexts/use-active-note"
import { useUndoRecorder } from "@/contexts/undo/use-undo"
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
import { TaskStepMoves } from "../NoteStepMoves"
import { useShowTaskDetails } from "../rightbar/use-right-panel"
import { useActiveNoteId, useSelectTask } from "@/contexts/use-tabs"

type ButtonMenuFolderProps = {
    task: Task
    onAddSubtask?: () => void
    /** The task row: right click on it opens this menu, its <ItemMenuButton /> opens it below the button. */
    children: ReactElement
}

export const ButtonMenuTask = ({ task, onAddSubtask, children }: ButtonMenuFolderProps) => {
    const { t } = useTranslation()
    // The inline input is opened once the menu has given the focus back, otherwise the input would lose it
    const addSubtaskRequested = useRef(false)
    const menu = useItemMenuState()
    const [isDescriptionOpen, setDescriptionOpen] = useState(false)
    const [isDeleteTaskOpen, setDeleteTaskOpen] = useState(false)
    const { updateTaskPriority, updateTaskDescription, updateItemColor } = useWorkspaceActions()
    const activeId = useActiveNoteId()
    const { patchTask, removeTask } = useActiveNoteActions()
    const recorder = useUndoRecorder()
    const selectTask = useSelectTask()
    const showTaskDetails = useShowTaskDetails()

    const handleEditPriority = async () => {
        // Optimistic: the cached tree is updated at once and restored if the write fails
        const rollback = patchTask(task.id, { priority: !task.priority })
        try {
            await updateTaskPriority(task.id, !task.priority)
            recorder.taskPriority(task.id, task.text, !!task.priority, !task.priority)
        } catch {
            rollback()
            toast.error(t("tasks.errors.priority"))
        } finally {
            menu.close()
        }
    }

    const handleDescription = async () => {
        if (task.description) {
            const rollback = patchTask(task.id, { description: "" })
            try {
                await updateTaskDescription(task.id, undefined)
                recorder.taskDescription(task.id, task.text, task.description ?? "", "")
            } catch (err) {
                rollback()
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

    // The color is applied to the cached tree at once and restored if the write fails
    const addColorItem = async (itemType: DBItemType, itemId: number, color?: string) => {
        const rollback = patchTask(itemId, { color: color ?? null })
        try {
            await updateItemColor(itemType, itemId, color)
        } catch (error) {
            rollback()
            throw error
        }
    }

    // The dialogs call it after their write succeeded: the cached tree needs no reload
    const noReload = async () => { }

    const items = (
        <MenuGroup className="flex flex-col gap-1">
            <ButtonInPopover
                text={t("details.showTask")}
                type="details"
                onClick={() => { if (showTaskDetails) showTaskDetails(task.id); else selectTask(task.id); menu.close() }}
            />
            <ButtonInPopover
                text={t("tasks.addSubtask")}
                type="addSubtask"
                onClick={() => { addSubtaskRequested.current = true; menu.close() }}
            />
            <ButtonInPopover
                text={task.description ? t("tasks.menu.removeDescription") : t("tasks.menu.addDescription")}
                type={task.description ? 'removeDescription' : 'addDescription'}
                onClick={() => { handleDescription() }}
            />
            <ButtonInPopover
                text={task.priority ? t("tasks.menu.removePriority") : t("tasks.menu.addPriority")}
                type={task.priority ? 'removePriority' : 'addPriority'}
                onClick={() => { handleEditPriority(); menu.close() }}
            />
            <MenuSub>
                <MenuSubTrigger>
                    <ButtonInPopover
                        text={t("menu.changeColor")}
                        type="color"
                    />
                </MenuSubTrigger>
                <MenuSubContent>
                    <DialogAddColor
                        item={task}
                        itemType="task"
                        addColorItem={addColorItem}
                        getItemId={activeId ?? undefined}
                        getItemData={noReload}
                        setDropDownOpen={menu.close}
                    />
                </MenuSubContent>
            </MenuSub>
            <TaskStepMoves taskId={task.id} onDone={menu.close} />
            <TaskMoveSubmenu taskId={task.id} onDone={menu.close} />
            <Separator />
            <ButtonInPopover
                text={t("common.delete")}
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
                getItemData={async () => { removeTask(task.id) }}
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
