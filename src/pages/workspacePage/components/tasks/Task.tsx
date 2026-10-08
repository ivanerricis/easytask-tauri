import { useTranslation } from "react-i18next"
import { Checkbox } from "@/components/ui/checkbox"
import type { Task as TaskType } from "@/types/types"
import { ButtonMenuTask } from "./ButtonMenuTask"
import { ItemMenuButton } from "@/components/item-menu"
import { useWorkspaceActions } from "@/contexts/workspace-data"
import { useActiveNoteActions } from "@/contexts/use-active-note"
import { useUndoRecorder } from "@/contexts/undo/use-undo"
import { reportError } from "@/lib/report-error"
import { withRollback } from "@/contexts/with-rollback"
import { useInlineEdit } from "@/hooks/use-inline-edit"
import { useAutomations } from "@/hooks/use-automations"
import { cn, getErrorMessage } from "@/lib/utils"
import React, { useCallback, useState } from "react"
import { AutoTextarea } from "@/components/auto-textarea"
import { InlineErrorTooltip } from "@/components/inline-error-tooltip"
import { AlignLeft, Flag, Info, ListTree, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TooltipCustom } from "@/components/tooltip-custom"
import { AddTask } from "./AddTask"
import { DialogTaskDescription } from "./DialogTaskDescription"
import { useNoteDrag, useNoteDrop } from "../note-dnd-state"
import { useIsTaskSelected, useSelectTask } from "@/contexts/use-tabs"
import { useShowTaskDetails } from "../rightbar/use-right-panel"
import { visibleTasks } from "../section/hide-completed"
import { DropLine } from "../sidebar/DropLine"

// Clicks on these keep their own action (checkbox, buttons) and do not select the row
const SELECTION_IGNORED = "button, [role=button], [role=checkbox]"

type TaskProps = {
    task: TaskType
    /** Nesting level: 0 for a task of the section, 1+ for subtasks. */
    depth?: number
    /** Shows how many direct subtasks are completed (preference "Show completed subtasks"). */
    showSubtaskCount?: boolean
    /** Hides the fully completed subtasks (see isHiddenTask). Only primitive props: the subtasks are rendered here, so the memo holds. */
    hideCompleted?: boolean
}

export const Task = React.memo(({ task, depth = 0, showSubtaskCount = true, hideCompleted = false }: TaskProps) => {
    const { t } = useTranslation()
    const [open, onOpenChange] = useState(false)
    const [isAddingSubtask, setAddingSubtask] = useState(false)
    const { updateTaskCompletion, renameItem } = useWorkspaceActions()
    const { patchTask } = useActiveNoteActions()
    const recorder = useUndoRecorder()
    const { dispatch } = useAutomations()
    const { editing: isTextAreaOpen, error, start: startEdit, inputProps } = useInlineEdit<HTMLTextAreaElement>({
        value: task.text,
        errorMessage: err => t("tasks.errors.rename", { message: getErrorMessage(err) }),
        onCommit: async next => {
            // Optimistic: the cached tree is updated at once and restored if the write fails
            await withRollback(patchTask(task.id, { text: next }), () => renameItem("task", task.id, next))
            recorder.rename("task", task.id, task.text, next)
        },
    })
    const selected = useIsTaskSelected(task.id)
    const selectTask = useSelectTask()
    const showTaskDetails = useShowTaskDetails()
    const { setNodeRef: setDropRef, zone, active } = useNoteDrop("task", task.id)
    const { setNodeRef: setDragRef, dragProps, isDragging } = useNoteDrag("task", task.id)

    // The row (without its subtasks) is both a drop target and the dimmed source while it is dragged
    const setRowRef = useCallback((node: HTMLElement | null) => {
        setDropRef(node)
        setDragRef(node)
    }, [setDropRef, setDragRef])
    const draggingTask = active?.kind === "task"
    const isSubtask = depth > 0
    // The line of a subtask runs under the checkbox of its parent: the checkbox of a subtask is 2px narrower than the one
    // of a task, so under a subtask (depth 2+) the line sits 1px to the left (and the tick is 1px longer to reach the checkbox). Both ends of a line keep 3px from the checkboxes
    const nestedSubtask = depth > 1
    const lineLeft = nestedSubtask ? "-left-[2px]" : "-left-px"
    const doneSubtasks = task.subtasks.filter(subtask => subtask.completed).length
    const hasDescription = !!task.description?.trim()

    const handleCheckedChange = async () => {
        // Optimistic: the cached tree is updated at once and restored if the write fails
        const rollback = patchTask(task.id, { completed: !task.completed })
        try {
            await updateTaskCompletion(task.id, !task.completed)
            recorder.taskCompletion(task.id, task.text, !!task.completed, !task.completed)
            void dispatch({ type: task.completed ? "task.reopened" : "task.completed", taskId: task.id })
        } catch (err) {
            rollback()
            reportError(err, t("tasks.errors.update", { message: getErrorMessage(err) }))
        }
    }

    return (
        <div className={cn(
            "relative flex flex-col items-center w-full border border-transparent transition-none",
            isSubtask ? "group/subtask subtask" : "border-b-border",
            isTextAreaOpen && (error ? "border border-destructive rounded-xs" : "border border-primary rounded-xs")
        )}>
            {/* Tree connectors: the line of the parent goes on past every subtask but the last, where it turns into its tick (└). Only the direct child of the last subtask counts (a plain descendant selector would hide the lines of every deeper level) */}
            {isSubtask && <>
                <span aria-hidden className={cn("pointer-events-none absolute -top-px -bottom-px w-px bg-muted-foreground/45 [.subtask:last-child>&]:hidden", lineLeft)} />
                <span aria-hidden className={cn("pointer-events-none absolute -top-px h-[19px] w-px [.subtask:last-child>&]:bg-muted-foreground/45", lineLeft)} />
            </>}
            <ButtonMenuTask task={task} onAddSubtask={() => setAddingSubtask(true)} onRename={startEdit}>
                <div
                    ref={setRowRef}
                    {...dragProps}
                    data-task-id={task.id}
                    data-selected={selected ? "true" : undefined}
                    aria-current={selected ? "true" : undefined}
                    onClick={e => {
                        if (!(e.target as HTMLElement).closest(SELECTION_IGNORED)) selectTask(task.id)
                    }}
                    onFocus={() => selectTask(task.id)}
                    className={cn(
                        "peer/row relative flex flex-col items-center w-full touch-none cursor-grab active:cursor-grabbing",
                        selected && "bg-accent/50",
                        isDragging && "opacity-40",
                        draggingTask && (zone === "inside" || zone === "inside-start") && "bg-primary/15 ring-1 ring-inset ring-primary",
                    )}
                >
                    {draggingTask && <DropLine zone={zone} outside />}
                    {/* The line of the subtasks starts under the checkbox: with a long text the row is tall, so it runs down to the bottom of the row where the line of the first subtask goes on */}
                    {(task.subtasks.length > 0 || isAddingSubtask) &&
                        <span aria-hidden className={cn(
                            "pointer-events-none absolute bottom-0 w-px bg-muted-foreground/45",
                            isSubtask ? "left-[27px] top-[26px]" : "left-[28px] top-[27px]",
                        )} />}
                    <div className="flex flex-col w-full">
                        {/* Color Container */}
                        {task.color && <div className="w-1 absolute left-0 top-0 h-full self-stretch" style={{ backgroundColor: task.color }}></div>}

                        {/* Task items container */}
                        <div className="relative group flex min-w-0 items-start justify-between w-full px-1 py-1.5">

                            {/* Checkbox && text container */}
                            <div className="flex min-w-0 items-start justify-between gap-2 ml-4 w-full">
                                <Checkbox
                                    checked={!!task.completed}
                                    onCheckedChange={handleCheckedChange}
                                    aria-label={t("tasks.toggleCompleted", { text: task.text })}
                                    className={isSubtask ? "mt-[3px] size-3.5" : "mt-0.5"}
                                />
                                {!isTextAreaOpen && <AutoTextarea
                                    onClick={startEdit}
                                    onKeyDown={e => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault()
                                            startEdit()
                                        }
                                    }}
                                    aria-label={t("tasks.editText")}
                                    value={task.text}
                                    // Read only until the click opens the editing: a right click here opens the menu of the task, not the one of a text field
                                    readOnly
                                    className={cn(
                                        "w-full min-w-0 max-h-auto text-wrap break-words [overflow-wrap:anywhere] whitespace-normal resize-none text-sm",
                                        task.completed && "line-through text-muted-foreground"
                                    )}
                                />}
                                {isTextAreaOpen && <InlineErrorTooltip message={error}><AutoTextarea
                                    {...inputProps}
                                    onPointerDown={e => e.stopPropagation()}
                                    minRows={1}
                                    className="w-full min-w-0 max-h-auto text-wrap break-words [overflow-wrap:anywhere] whitespace-normal resize-none text-sm"
                                /></InlineErrorTooltip>}
                            </div>

                            {/* What the task has besides its text: a description (click to read it) and its subtasks (done / total) */}
                            {(hasDescription || (showSubtaskCount && task.subtasks.length > 0)) &&
                                <div className="flex shrink-0 items-center gap-1.5 mt-0.5 ml-1 text-xs">
                                    {hasDescription &&
                                        // The toolbar that shows on hover covers this one and has the same button: this copy is out of the
                                        // tab order and of the accessibility tree
                                        <TooltipCustom text={t("tasks.showDescription")}>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                tabIndex={-1}
                                                aria-hidden
                                                data-testid="description-indicator"
                                                onClick={() => { onOpenChange(true) }}
                                                className="size-6 -m-1 text-muted-foreground hover:text-foreground">
                                                <AlignLeft className="size-3.5" />
                                            </Button>
                                        </TooltipCustom>}
                                    {showSubtaskCount && task.subtasks.length > 0 &&
                                        <span
                                            title={t("tasks.subtaskProgress", { done: doneSubtasks, total: task.subtasks.length })}
                                            className={cn(
                                                "flex items-center gap-0.5 tabular-nums",
                                                // All done: full-contrast text (the accent color is chosen by the user and can be unreadable as text)
                                                doneSubtasks === task.subtasks.length ? "font-medium text-foreground" : "text-muted-foreground",
                                            )}>
                                            <ListTree className="size-3.5" />
                                            {doneSubtasks}/{task.subtasks.length}
                                        </span>}
                                </div>}

                            {/* Priority: a flag (not just a color) */}
                            {!!task.priority &&
                                <TooltipCustom text={t("details.priority")}>
                                    <span role="img" aria-label={t("details.priority")} className="flex shrink-0 mx-2 mt-1 text-priority">
                                        <Flag className="size-3.5 fill-current" />
                                    </span>
                                </TooltipCustom>}

                            {/* ButtonMenu */}
                            <div className="flex items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 absolute top-1 right-1 rounded-xs bg-secondary">
                                {hasDescription &&
                                    <TooltipCustom text={t("tasks.showDescription")}>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            aria-label={t("tasks.showDescription")}
                                            onClick={() => { onOpenChange(true) }}
                                            className="size-6">
                                            <AlignLeft />
                                        </Button>
                                    </TooltipCustom>}
                                <TooltipCustom text={t("details.showTask")}>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        aria-label={t("details.showTask")}
                                        onClick={() => { if (showTaskDetails) showTaskDetails(task.id); else selectTask(task.id) }}
                                        className="size-6">
                                        <Info />
                                    </Button>
                                </TooltipCustom>
                                <TooltipCustom text={t("tasks.addSubtask")}>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        aria-label={t("tasks.addSubtask")}
                                        onClick={() => setAddingSubtask(true)}
                                        className="size-6">
                                        <Plus />
                                    </Button>
                                </TooltipCustom>
                                <ItemMenuButton name={task.text} />
                            </div>
                        </div>
                    </div>
                    {open && <DialogTaskDescription task={task} open={open} onOpenChange={onOpenChange} />}
                </div>
            </ButtonMenuTask>
            {isSubtask && <span aria-hidden className={cn("pointer-events-none absolute top-[17px] h-px bg-muted-foreground/45", lineLeft, nestedSubtask ? "w-[19px]" : "w-[18px]")} />}
            {/* Subtasks hang from the checkbox of their parent (see the tree connectors above) */}
            {(task.subtasks.length > 0 || isAddingSubtask) && <div className="flex flex-col self-stretch ml-7 mb-1">
                {visibleTasks(task.subtasks, hideCompleted).map(subtask =>
                    <Task key={subtask.id} task={subtask} depth={depth + 1} showSubtaskCount={showSubtaskCount} hideCompleted={hideCompleted} />)}
                {isAddingSubtask &&
                    <AddTask sectionId={task.sectionID} parentTaskId={task.id} onClose={() => setAddingSubtask(false)} />}
            </div>}
        </div >
    )
})