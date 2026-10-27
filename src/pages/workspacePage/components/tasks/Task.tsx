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
import { useColorAlpha } from "@/contexts/use-color-alpha"
import { cn, getErrorMessage, hexToRgba } from "@/lib/utils"
import React, { useCallback, useRef, useState, type HTMLAttributes } from "react"
import { AutoTextarea } from "@/components/auto-textarea"
import { InlineErrorTooltip } from "@/components/inline-error-tooltip"
import { AlignLeft, Flag, ListTree, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TooltipCustom } from "@/components/tooltip-custom"
import { AddTask } from "./AddTask"
import { DialogTaskDescription } from "./DialogTaskDescription"
import { useNoteDrag, useNoteDrop } from "../note-dnd-state"
import type { DropZone } from "../note-dnd"
import { useIsTaskSelected, useSelectTask, useSubtasksOpen } from "@/contexts/use-tabs"
import { visibleTasks } from "../section/hide-completed"
import { DropLine } from "../sidebar/DropLine"
import type { TaskDensity } from "@/lib/store/preferences"
import { TASK_DENSITIES } from "./task-density"
import { SelectionMark } from "../sidebar/SelectionMark"
import { handleSelectionClick } from "../sidebar/selection"
import { useIsTaskMultiSelected, useTaskSelectionStore } from "./task-selection-context"
import { taskKey } from "./task-selection"
import { useSearchHighlight } from "../note-search-context"
import { SearchedTaskText } from "./SearchedTaskText"

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
    /** Whether a click on the text starts the rename (preference "Rename on click"); otherwise only the menu does. */
    renameOnClick?: boolean
    /** Spacing and text size of the rows (preference "Task density"); a primitive prop, so the memo holds when other preferences change. */
    density?: TaskDensity
}

type TaskRowProps = TaskProps & {
    /** Ref of the row: it is a drop target and a draggable (the hooks live in {@link Task}). */
    setRowRef: (node: HTMLElement | null) => void
    dragProps: HTMLAttributes<HTMLElement>
    isDragging: boolean
    /**
     * Drop zone highlighted on this row while a task is dragged over it (null on every other row, also while a task is
     * dragged: a flag shared by all the rows would re-render all of them when a drag starts and ends).
     */
    dropZone: DropZone | null
}

/**
 * The drag & drop hooks of dnd-kit re-render the component that calls them every time the dragged item moves over another
 * one, so they live in this thin shell: the heavy row below is memoized and only re-renders when its own props change
 * (a note with hundreds of tasks would otherwise re-render every row on every step of a drag).
 */
export const Task = React.memo((props: TaskProps) => {
    const { setNodeRef: setDropRef, zone, active } = useNoteDrop("task", props.task.id)
    const { setNodeRef: setDragRef, dragProps, isDragging } = useNoteDrag("task", props.task.id)

    // The row (without its subtasks) is both a drop target and the dimmed source while it is dragged
    const setRowRef = useCallback((node: HTMLElement | null) => {
        setDropRef(node)
        setDragRef(node)
    }, [setDropRef, setDragRef])

    return <TaskRow {...props} setRowRef={setRowRef} dragProps={dragProps} isDragging={isDragging} dropZone={active?.kind === "task" ? zone : null} />
})

const TaskRow = React.memo(({ task, depth = 0, showSubtaskCount = true, hideCompleted = false, renameOnClick = true, density = "normal", setRowRef, dragProps, isDragging, dropZone }: TaskRowProps) => {
    const { t } = useTranslation()
    const [open, onOpenChange] = useState(false)
    const [isAddingSubtask, setAddingSubtask] = useState(false)
    const { updateTaskCompletion, renameItem } = useWorkspaceActions()
    const { patchTask } = useActiveNoteActions()
    const recorder = useUndoRecorder()
    const colorAlpha = useColorAlpha()
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
    const search = useSearchHighlight("task", task.id)
    const selectTask = useSelectTask()
    const selectionStore = useTaskSelectionStore()
    const multiSelected = useIsTaskMultiSelected(task.id)
    // The press that is going to focus the row carried Ctrl/Cmd/Shift: it is a selection gesture, not a single selection
    const gestureDown = useRef(false)
    // Closed: the subtasks are not drawn (they stay in the note: counts, progress and "hide completed" still see them)
    const [subtasksOpen, toggleSubtasks] = useSubtasksOpen(task.id)
    const hasSubtasks = task.subtasks.length > 0
    const subtasksHidden = hasSubtasks && !subtasksOpen
    const isSubtask = depth > 0
    const sizes = TASK_DENSITIES[density]
    // The line of a subtask runs under the checkbox of its parent: the checkbox of a subtask is 2px narrower than the one
    // of a task, so under a subtask (depth 2+) the line sits 1px to the left (and the tick is 1px longer to reach the checkbox). Both ends of a line keep 3px from the checkboxes
    const nestedSubtask = depth > 1
    // The checkbox of a subtask starts where the text of its parent starts (the subtasks are indented by the checkbox of the
    // parent, 16px, or 14px when the parent is a subtask, plus the gap), so the tree connector sits at 3px (4px) from the row
    const lineLeft = nestedSubtask ? "left-[4px]" : "left-[3px]"
    const doneSubtasks = task.subtasks.filter(subtask => subtask.completed).length
    const hasDescription = !!task.description?.trim()

    // A new subtask of a closed task opens it first, so that the new subtask is seen
    const startAddSubtask = () => {
        if (!subtasksOpen) toggleSubtasks()
        setAddingSubtask(true)
    }

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
                <span aria-hidden className={cn("pointer-events-none absolute -top-px w-px [.subtask:last-child>&]:bg-muted-foreground/45", sizes.tickHeight, lineLeft)} />
            </>}
            <ButtonMenuTask task={task} onAddSubtask={startAddSubtask} onRename={startEdit} subtasksOpen={subtasksOpen} onToggleSubtasks={toggleSubtasks}>
                <div
                    ref={setRowRef}
                    {...dragProps}
                    data-task-id={task.id}
                    data-selected={selected ? "true" : undefined}
                    aria-current={selected ? "true" : undefined}
                    data-multi-selected={multiSelected ? "true" : undefined}
                    // Capture phase: a selection gesture must not reach the text (rename) or the other handlers of the row
                    onClickCapture={e => {
                        gestureDown.current = false
                        if ((e.target as HTMLElement).closest(SELECTION_IGNORED)) return
                        if (handleSelectionClick(selectionStore, taskKey(task.id), e)) {
                            e.preventDefault()
                            e.stopPropagation()
                        }
                    }}
                    onMouseDown={e => {
                        gestureDown.current = !!selectionStore && (e.shiftKey || e.ctrlKey || e.metaKey)
                        // No text selection while extending a range with Shift
                        if (selectionStore && e.shiftKey) e.preventDefault()
                    }}
                    onClick={e => {
                        if (!(e.target as HTMLElement).closest(SELECTION_IGNORED)) selectTask(task.id)
                    }}
                    onFocus={() => {
                        const gesture = gestureDown.current
                        gestureDown.current = false
                        if (!gesture) selectTask(task.id)
                    }}
                    className={cn(
                        "peer/row relative flex flex-col items-center w-full touch-none cursor-grab active:cursor-grabbing",
                        // Selected: a 2px bar in the primary colour on the left and a tint stronger than the hover one
                        selected && "bg-accent shadow-[inset_2px_0_0_0_var(--primary)]",
                        isDragging && "opacity-40",
                        (dropZone === "inside" || dropZone === "inside-start") && "bg-primary/15 ring-1 ring-inset ring-primary",
                    )}
                >
                    <DropLine zone={dropZone} outside />
                    <SelectionMark selected={multiSelected} />
                    {/* The line of the subtasks starts under the checkbox: with a long text the row is tall, so it runs down to the bottom of the row where the line of the first subtask goes on */}
                    {((hasSubtasks && subtasksOpen) || isAddingSubtask) &&
                        <span aria-hidden className={cn(
                            "pointer-events-none absolute bottom-0 w-px bg-muted-foreground/45",
                            isSubtask ? ["left-[27px]", sizes.lineTop.subtask] : ["left-[28px]", sizes.lineTop.task],
                        )} />}
                    <div className="flex flex-col w-full">
                        {/* Color Container */}
                        {/* The color tints the whole row (light) besides the side bar (full color) */}
                        {task.color && colorAlpha.taskBackground && <div aria-hidden className="pointer-events-none absolute inset-0" style={{ backgroundColor: hexToRgba(colorAlpha.task(), task.color) }}></div>}
                        {task.color && <div className="w-1 absolute left-0 top-0 h-full self-stretch" style={{ backgroundColor: task.color }}></div>}

                        {/* Task items container */}
                        <div className={cn("relative group flex min-w-0 items-start justify-between w-full px-1", sizes.padding)}>

                            {/* Checkbox && text container */}
                            <div className="flex min-w-0 items-start justify-between gap-2 ml-4 w-full">
                                <Checkbox
                                    checked={!!task.completed}
                                    onCheckedChange={handleCheckedChange}
                                    aria-label={t("tasks.toggleCompleted", { text: task.text })}
                                    className={isSubtask ? cn("size-3.5", sizes.subtaskCheckbox) : sizes.checkbox}
                                />
                                {!isTextAreaOpen && search.query && <SearchedTaskText
                                    text={task.text}
                                    query={search.query}
                                    active={search.active}
                                    label={t("tasks.editText")}
                                    onClick={renameOnClick ? startEdit : undefined}
                                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); startEdit() } }}
                                    className={cn(
                                        "w-full min-w-0 text-wrap break-words [overflow-wrap:anywhere]", sizes.text,
                                        !renameOnClick && "cursor-default",
                                        task.completed && "line-through text-muted-foreground"
                                    )}
                                />}
                                {!isTextAreaOpen && !search.query && <AutoTextarea
                                    onClick={renameOnClick ? startEdit : undefined}
                                    onKeyDown={e => {
                                        // Enter always renames (the way for the keyboard when the click does not)
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
                                        "w-full min-w-0 max-h-auto text-wrap break-words [overflow-wrap:anywhere] whitespace-normal resize-none", sizes.text,
                                        !renameOnClick && "cursor-default",
                                        task.completed && "line-through text-muted-foreground"
                                    )}
                                />}
                                {isTextAreaOpen && <InlineErrorTooltip message={error}><AutoTextarea
                                    {...inputProps}
                                    onPointerDown={e => e.stopPropagation()}
                                    minRows={1}
                                    className={cn("w-full min-w-0 max-h-auto text-wrap break-words [overflow-wrap:anywhere] whitespace-normal resize-none", sizes.text)}
                                /></InlineErrorTooltip>}
                            </div>

                            {/* What the task has besides its text: a description (click to read it) and its subtasks (done / total) */}
                            {(hasDescription || ((showSubtaskCount || subtasksHidden) && hasSubtasks)) &&
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
                                    {/* Hidden subtasks always show their count (also with the preference off): it is the sign that there are some */}
                                    {(showSubtaskCount || subtasksHidden) && hasSubtasks &&
                                        <span
                                            data-testid="subtask-count"
                                            data-subtasks-hidden={subtasksHidden ? "true" : undefined}
                                            title={t(subtasksHidden ? "tasks.subtaskProgressHidden" : "tasks.subtaskProgress", { done: doneSubtasks, total: task.subtasks.length })}
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
                                <TooltipCustom text={t("tasks.addSubtask")}>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        aria-label={t("tasks.addSubtask")}
                                        onClick={startAddSubtask}
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
            {isSubtask && <span aria-hidden className={cn("pointer-events-none absolute h-px bg-muted-foreground/45", sizes.tickTop, lineLeft, nestedSubtask ? "w-[13px]" : "w-[14px]")} />}
            {/* Subtasks hang from the checkbox of their parent (see the tree connectors above) */}
            {((hasSubtasks && subtasksOpen) || isAddingSubtask) && <div className={cn("flex flex-col self-stretch", sizes.subtasks, isSubtask ? "ml-[22px]" : "ml-6")}>
                {visibleTasks(task.subtasks, hideCompleted).map(subtask =>
                    <Task key={subtask.id} task={subtask} depth={depth + 1} showSubtaskCount={showSubtaskCount} hideCompleted={hideCompleted} renameOnClick={renameOnClick} density={density} />)}
                {isAddingSubtask &&
                    <AddTask sectionId={task.sectionID} parentTaskId={task.id} onClose={() => setAddingSubtask(false)} />}
            </div>}
        </div >
    )
})