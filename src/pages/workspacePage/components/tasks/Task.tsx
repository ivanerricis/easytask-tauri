import { useTranslation } from "react-i18next"
import { Checkbox } from "@/components/ui/checkbox"
import type { Task as TaskType } from "@/types/types"
import { ButtonMenuTask } from "./ButtonMenuTask"
import { ItemMenuButton } from "@/components/item-menu"
import { useWorkspaceActions } from "@/contexts/workspace-data"
import { useActiveNoteActions } from "@/contexts/use-active-note"
import { useUndoRecorder } from "@/contexts/undo/use-undo"
import { toast } from "sonner"
import { cn, getErrorMessage } from "@/lib/utils"
import React, { useCallback, useEffect, useRef, useState } from "react"
import TextareaAutosize from "react-textarea-autosize"
import { AlignLeft, GripVertical, Info, ListTree, Plus } from "lucide-react"
import { AddTask } from "./AddTask"
import { DialogTaskDescription } from "./DialogTaskDescription"
import { useNoteDrag, useNoteDrop } from "../note-dnd-state"
import { useIsTaskSelected, useSelectTask } from "@/contexts/use-tabs"
import { useShowTaskDetails } from "../rightbar/use-right-panel"

// Clicks on these keep their own action (checkbox, buttons, drag handle) and do not select the row
const SELECTION_IGNORED = "button, [role=button], [role=checkbox]"

type TaskProps = {
    task: TaskType
    /** Nesting level: 0 for a task of the section, 1+ for subtasks. */
    depth?: number
    /** Shows how many direct subtasks are completed (preference "Show completed subtasks"). */
    showSubtaskCount?: boolean
    children?: React.ReactNode
}

export const Task = React.memo(({ task, depth = 0, showSubtaskCount = true, children }: TaskProps) => {
    const { t } = useTranslation()
    const [isTextAreaOpen, setTextAreaOpen] = useState(false)
    const [text, setText] = useState(task.text)
    const [open, onOpenChange] = useState(false)
    const [isAddingSubtask, setAddingSubtask] = useState(false)
    const { updateTaskCompletion, renameItem } = useWorkspaceActions()
    const { patchTask } = useActiveNoteActions()
    const recorder = useUndoRecorder()
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    // Set once an edit has ended (saved or cancelled): Enter + the blur on unmount, or Escape + blur, must not run twice
    const editDoneRef = useRef(false)
    const selected = useIsTaskSelected(task.id)
    const selectTask = useSelectTask()
    const showTaskDetails = useShowTaskDetails()
    const { setNodeRef: setDropRef, zone, active } = useNoteDrop("task", task.id)
    const { setNodeRef: setDragRef, setActivatorNodeRef, attributes, listeners, isDragging } = useNoteDrag("task", task.id)

    // The row (without its subtasks) is both a drop target and the dimmed source while it is dragged
    const setRowRef = useCallback((node: HTMLElement | null) => {
        setDropRef(node)
        setDragRef(node)
    }, [setDropRef, setDragRef])
    const draggingTask = active?.kind === "task"
    const isSubtask = depth > 0
    const doneSubtasks = task.subtasks.filter(subtask => subtask.completed).length

    useEffect(() => {
        if (isTextAreaOpen && textareaRef.current) {
            editDoneRef.current = false
            const input = textareaRef.current
            const length = input.value.length
            input.focus()
            input.setSelectionRange(length, length)
        }
    }, [isTextAreaOpen])

    const handleCheckedChange = async () => {
        // Optimistic: the cached tree is updated at once and restored if the write fails
        const rollback = patchTask(task.id, { completed: !task.completed })
        try {
            await updateTaskCompletion(task.id, !task.completed)
            recorder.taskCompletion(task.id, task.text, !!task.completed, !task.completed)
        } catch (err) {
            rollback()
            toast.error(t("tasks.errors.update", { message: getErrorMessage(err) }))
        }
    }

    const handleCancelEdit = () => {
        if (editDoneRef.current) return
        editDoneRef.current = true
        setText(task.text)
        setTextAreaOpen(false)
    }

    const handleChangeText = async () => {
        if (editDoneRef.current) return
        editDoneRef.current = true
        // Optimistic: the cached tree is updated at once and restored if the write fails
        const changed = text.trim() !== task.text && text.trim() !== ""
        const rollback = changed ? patchTask(task.id, { text: text.trim() }) : null
        try {
            if (changed) {
                await renameItem("task", task.id, text.trim())
                recorder.rename("task", task.id, task.text, text.trim())
            }
        } catch (err) {
            rollback?.()
            toast.error(t("tasks.errors.rename", { message: getErrorMessage(err) }))
        }
        setTextAreaOpen(false)
    }

    return (
        <div className={cn(
            "relative flex flex-col items-center w-full border border-transparent transition-none",
            isSubtask ? "group/subtask" : "border-b-border",
            isTextAreaOpen && "border border-primary rounded-xs"
        )}>
            {/* Tree connectors: the line of the parent goes on past every subtask but the last, where it turns into its tick (└) */}
            {isSubtask && <>
                <span aria-hidden className="pointer-events-none absolute -left-px -top-px -bottom-px w-px bg-muted-foreground/45 group-last/subtask:hidden" />
                <span aria-hidden className="pointer-events-none absolute -left-px -top-px h-[19px] w-4 border-b border-muted-foreground/45 group-last/subtask:border-l" />
            </>}
            <ButtonMenuTask task={task} onAddSubtask={() => setAddingSubtask(true)}>
                <div
                    ref={setRowRef}
                    data-task-id={task.id}
                    data-selected={selected ? "true" : undefined}
                    aria-current={selected ? "true" : undefined}
                    onClick={e => {
                        if (!(e.target as HTMLElement).closest(SELECTION_IGNORED)) selectTask(task.id)
                    }}
                    onFocus={() => selectTask(task.id)}
                    className={cn(
                        "relative flex flex-col items-center w-full",
                        selected && "bg-accent/50",
                        isDragging && "opacity-40",
                        draggingTask && (zone === "inside" || zone === "inside-start") && "bg-primary/15 ring-1 ring-inset ring-primary",
                    )}
                >
                    {draggingTask && (zone === "before" || zone === "after") &&
                        <div className={cn("pointer-events-none absolute left-0 right-0 z-10 h-0.5 bg-primary", zone === "before" ? "-top-px" : "-bottom-px")} />}
                    <div className="flex flex-col w-full">
                        {/* Color Container */}
                        {task.color && <div className="w-0.5 absolute left-0 top-0 h-full self-stretch" style={{ backgroundColor: task.color }}></div>}

                        {/* Task items container */}
                        <div className="relative group flex items-start justify-between w-full px-1 py-1.5">

                            {/* Drag handle */}
                            <div
                                ref={setActivatorNodeRef}
                                {...attributes}
                                {...listeners}
                                aria-label={t("tasks.moveHandle")}
                                title={t("tasks.moveHandleTitle")}
                                className="absolute left-0.5 top-2 z-10 touch-none cursor-grab active:cursor-grabbing text-muted-foreground opacity-0 hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100">
                                <GripVertical className="size-3.5" />
                            </div>

                            {/* Checkbox && text container */}
                            <div className="flex items-start justify-between gap-2 ml-4 w-full">
                                <Checkbox
                                    checked={!!task.completed}
                                    onCheckedChange={handleCheckedChange}
                                    className={isSubtask ? "mt-[3px] size-3.5" : "mt-0.5"}
                                />
                                {!isTextAreaOpen && <TextareaAutosize
                                    onClick={() => { setTextAreaOpen(true); setText(task.text) }}
                                    onKeyDown={e => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault()
                                            setTextAreaOpen(true)
                                            setText(task.text)
                                        }
                                    }}
                                    aria-label={t("tasks.editText")}
                                    value={task.text}
                                    className={cn(
                                        "w-full max-h-auto text-wrap break-words whitespace-normal resize-none text-sm",
                                        task.completed && "line-through text-muted-foreground"
                                    )}
                                />}
                                {isTextAreaOpen && <TextareaAutosize
                                    ref={textareaRef}
                                    minRows={1}
                                    value={text}
                                    onChange={e => setText(e.target.value)}
                                    onBlur={handleChangeText}
                                    onKeyDown={e => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            handleChangeText();
                                        } else if (e.key === "Escape") {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            handleCancelEdit()
                                        }
                                    }}
                                    className="w-full max-h-auto text-wrap break-words whitespace-normal resize-none text-sm"
                                />}
                            </div>

                            {/* Progress of the direct subtasks */}
                            {showSubtaskCount && task.subtasks.length > 0 &&
                                <span
                                    title={t("tasks.subtaskProgress", { done: doneSubtasks, total: task.subtasks.length })}
                                    className={cn(
                                        "flex shrink-0 items-center gap-0.5 mt-0.5 ml-1 text-xs tabular-nums",
                                        // All done: full-contrast text (the accent color is chosen by the user and can be unreadable as text)
                                        doneSubtasks === task.subtasks.length ? "font-medium text-foreground" : "text-muted-foreground",
                                    )}>
                                    <ListTree className="size-3.5" />
                                    {doneSubtasks}/{task.subtasks.length}
                                </span>}

                            {/* Priority circle */}
                            <div
                                role="img"
                                aria-label={t("details.priority")}
                                className={`${task.priority ? `flex` : `hidden`} rounded-full bg-red-600 size-2 mx-2 mt-1.5 p-1`}
                            ></div>

                            {/* ButtonMenu */}
                            <div className="flex items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 absolute top-1 right-1 rounded-xs bg-secondary">
                                <button
                                    type="button"
                                    aria-label={t("details.showTask")}
                                    title={t("details.showTask")}
                                    onClick={() => { if (showTaskDetails) showTaskDetails(task.id); else selectTask(task.id) }}
                                    className="p-1 rounded-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                    <Info className="size-4" />
                                </button>
                                <button
                                    type="button"
                                    aria-label={t("tasks.addSubtask")}
                                    title={t("tasks.addSubtask")}
                                    onClick={() => setAddingSubtask(true)}
                                    className="p-1 rounded-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                    <Plus className="size-4" />
                                </button>
                                <ItemMenuButton iconClassName="!h-4 !w-4" />
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center justify-start w-full gap-1 px-2">
                        {task.description &&
                            <button
                                type="button"
                                aria-label={t("tasks.showDescription")}
                                onClick={() => { onOpenChange(true) }}
                                className="p-1 flex items-center justify-center hover:bg-accent rounded-xs cursor-pointer mb-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                <AlignLeft className="size-4" />
                            </button>}
                        {open && <DialogTaskDescription task={task} open={open} onOpenChange={onOpenChange} />}
                    </div>
                </div>
            </ButtonMenuTask>
            {/* Subtasks hang from the checkbox of their parent (see the tree connectors above) */}
            {(task.subtasks.length > 0 || isAddingSubtask) && <div className="flex flex-col self-stretch ml-7 mb-1">
                {children}
                {isAddingSubtask &&
                    <AddTask sectionId={task.sectionID} parentTaskId={task.id} onClose={() => setAddingSubtask(false)} />}
            </div>}
        </div >
    )
})