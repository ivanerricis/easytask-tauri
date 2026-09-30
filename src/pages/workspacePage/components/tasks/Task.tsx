import { Checkbox } from "@/components/ui/checkbox"
import type { Task as TaskType } from "@/types/types"
import { ButtonMenuTask } from "./ButtonMenuTask"
import { useWorkspaceActions } from "@/contexts/workspace-data-context"
import { useActiveNoteActions } from "@/contexts/active-note-context"
import { toast } from "sonner"
import { cn, getErrorMessage } from "@/lib/utils"
import React, { useCallback, useEffect, useRef, useState } from "react"
import TextareaAutosize from "react-textarea-autosize"
import { AlignLeft, GripVertical, Plus } from "lucide-react"
import { AddTask } from "./AddTask"
import { DialogTaskDescription } from "./DialogTaskDescription"
import { useNoteDrag, useNoteDrop } from "../note-dnd-state"

type TaskProps = {
    task: TaskType
    children?: React.ReactNode
}

export const Task = React.memo(({ task, children }: TaskProps) => {
    const [isTextAreaOpen, setTextAreaOpen] = useState(false)
    const [text, setText] = useState(task.text)
    const [open, onOpenChange] = useState(false)
    const [isAddingSubtask, setAddingSubtask] = useState(false)
    const { updateTaskCompletion, renameItem } = useWorkspaceActions()
    const { refreshActiveNote, patchTask } = useActiveNoteActions()
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const { setNodeRef: setDropRef, zone, active } = useNoteDrop("task", task.id)
    const { setNodeRef: setDragRef, setActivatorNodeRef, attributes, listeners, isDragging } = useNoteDrag("task", task.id)

    // The row (without its subtasks) is both a drop target and the dimmed source while it is dragged
    const setRowRef = useCallback((node: HTMLElement | null) => {
        setDropRef(node)
        setDragRef(node)
    }, [setDropRef, setDragRef])
    const draggingTask = active?.kind === "task"

    useEffect(() => {
        if (isTextAreaOpen && textareaRef.current) {
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
        } catch (err) {
            rollback()
            toast.error('Impossibile modificare il task' + ' - ' + getErrorMessage(err))
        }
    }

    const handleChangeText = async () => {
        try {
            if (task.text !== text && text.trim() !== "") {
                await renameItem("task", task.id, text.trim())
                await refreshActiveNote()
            }
        } catch (err) {
            toast.error('Impossibile cambiare il testo del task' + ' - ' + getErrorMessage(err))
        }
        setTextAreaOpen(false)
    }

    return (
        <div className={cn(
            "relative flex flex-col items-center w-full border border-transparent transition-none",
            isTextAreaOpen && "border border-primary rounded-xs"
        )}>
            <div
                ref={setRowRef}
                className={cn(
                    "relative flex flex-col items-center w-full border-b",
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
                            aria-label="Sposta task"
                            title="Trascina per spostare il task"
                            className="absolute left-0.5 top-2 z-10 touch-none cursor-grab text-muted-foreground opacity-0 hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100">
                            <GripVertical className="size-3.5" />
                        </div>

                        {/* Checkbox && text container */}
                        <div className="flex items-start justify-between gap-2 ml-4 w-full">
                            <Checkbox
                                checked={!!task.completed}
                                onCheckedChange={handleCheckedChange}
                                className="mt-0.5"
                            />
                            {!isTextAreaOpen && <TextareaAutosize
                                onClick={() => { setTextAreaOpen(true); setText(task.text) }}
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
                                    }
                                }}
                                className="w-full max-h-auto text-wrap break-words whitespace-normal resize-none text-sm mt-[1px]"
                            />}
                        </div>

                        {/* Priority circle */}
                        <div className={`${task.priority ? `flex` : `hidden`} rounded-full bg-red-600 size-2 mx-2 mt-1.5 p-1`}></div>

                        {/* ButtonMenu */}
                        <div className="flex items-center opacity-0 group-hover:opacity-100 absolute top-1 right-1 rounded-xs bg-secondary">
                            <button
                                type="button"
                                aria-label="Aggiungi sottotask"
                                title="Aggiungi sottotask"
                                onClick={() => setAddingSubtask(true)}
                                className="p-1 rounded-xs cursor-pointer">
                                <Plus className="size-4" />
                            </button>
                            <ButtonMenuTask
                                task={task}
                                onAddSubtask={() => setAddingSubtask(true)}
                            />
                        </div>
                    </div>
                </div>
                <div className="flex items-center justify-start w-full gap-1 px-2">
                    {task.description &&
                        <button
                            onClick={() => { onOpenChange(true) }}
                            className="p-1 flex items-center justify-center hover:bg-accent rounded-xs cursor-pointer mb-1">
                            <AlignLeft className="size-4" />
                        </button>}
                    {open && <DialogTaskDescription task={task} open={open} onOpenChange={onOpenChange} />}
                </div>
            </div>
            {(task.subtasks.length > 0 || isAddingSubtask) && <div className="flex flex-col w-full pl-6">
                {children}
                {isAddingSubtask &&
                    <AddTask sectionId={task.sectionID} parentTaskId={task.id} onClose={() => setAddingSubtask(false)} />}
            </div>}
        </div >
    )
})