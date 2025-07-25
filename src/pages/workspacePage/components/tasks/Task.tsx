import { Checkbox } from "@/components/ui/checkbox"
import type { Task as TaskType } from "@/types/types"
import { ButtonMenuTask } from "./ButtonMenuTask"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import React, { useEffect, useRef, useState } from "react"
import TextareaAutosize from "react-textarea-autosize"

type TaskProps = {
    task: TaskType
    children?: React.ReactNode
}

export const Task = React.memo(({ task, children }: TaskProps) => {
    const [isTextAreaOpen, setTextAreaOpen] = useState(false)
    const [text, setText] = useState(task.text)
    const { updateTaskCompletion, renameItem, getNoteData, currentNote } = useWorkspaceData()
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        if (isTextAreaOpen && textareaRef.current) {
            const input = textareaRef.current
            const length = input.value.length
            input.focus()
            input.setSelectionRange(length, length)
        }
    }, [isTextAreaOpen])

    const handleCheckedChange = async () => {
        try {
            await updateTaskCompletion(task.id, !task.completed)
            if (currentNote)
                await getNoteData(currentNote.id)
        } catch (err: any) {
            toast.error('Impossibile modificare il task' + ' - ' + err.message)
        }
    }

    const handleChangeText = async () => {
        try {
            if (task.text !== text && text.trim() !== "") {
                await renameItem("task", task.id, text.trim())
                if (currentNote)
                    await getNoteData(currentNote.id)
            }
        } catch (err: any) {
            toast.error('Impossibile cambiare il testo del task' + ' - ' + err.message)
        }
        setTextAreaOpen(false)
    }

    return (
        <div className={cn(
            "relative flex flex-col items-center w-full border border-transparent transition-none",
            isTextAreaOpen && "border border-primary rounded-xs"
        )}>
            <div className="relative flex items-center w-full border-b">
                {/* Color Container */}
                {task.color && <div className="w-0.5 absolute left-0 top-0 h-full self-stretch" style={{ backgroundColor: task.color }}></div>}

                {/* Task items container */}
                <div className="group flex items-start justify-between w-full p-2">

                    {/* Checkbox && text container */}
                    <div className="flex items-start gap-2 ml-1 w-full">
                        <Checkbox
                            checked={!!task.completed}
                            onCheckedChange={handleCheckedChange}
                            className="cursor-pointer mt-0.5"
                        />
                        {!isTextAreaOpen && <TextareaAutosize
                            onClick={() => { setTextAreaOpen(true), setText(task.text) }}
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
                            className="w-full max-h-auto text-wrap break-words whitespace-normal resize-none text-sm"
                        />}
                    </div>

                    {/* Priority circle */}
                    <div className={`${task.priority ? `flex` : `hidden`} rounded-full bg-red-500 w-2 h-2 p-1 ml-2 mr-1 mt-2`}></div>

                    {/* ButtonMenu */}
                    <div className="opacity-0 group-hover:opacity-100">
                        <ButtonMenuTask
                            task={task}
                        />
                    </div>
                </div>
            </div>
            {task.subtasks.length > 0 && <div className="flex items-center w-full pl-6">
                {children}
            </div>}
        </div >
    )
})