import { Checkbox } from "@/components/ui/checkbox"
import type { Task as TaskType } from "@/types/types"
import { ButtonMenuTask } from "./ButtonMenuTask"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import React from "react"

type TaskProps = {
    task: TaskType
    children?: React.ReactNode
}

export const Task = React.memo(({ task, children }: TaskProps) => {
    const { editTaskCompletion, getNoteData, currentNote } = useWorkspaceData()

    const handleCheckedChange = async () => {
        try {
            await editTaskCompletion(task.id, !task.completed)
            if (currentNote)
                await getNoteData(currentNote.id)
        } catch (error) {
            toast.error('Impossibile modificare il task')
        }
    }

    return (
        <div className="relative flex flex-col items-center w-full">

            <div className="relative flex items-center w-full border-b">
                {/* Color Container */}
                {task.color && <div className="w-0.5 absolute left-0 top-0 h-full self-stretch" style={{ backgroundColor: task.color }}></div>}

                {/* Task items container */}
                <div className="group flex items-center justify-between w-full p-2">

                    {/* Checkbox && text container */}
                    <div className="flex items-center gap-2 ml-1 w-full">
                        <Checkbox
                            checked={!!task.completed}
                            onCheckedChange={handleCheckedChange}
                            className="cursor-pointer"
                        />
                        <h1 className={cn(
                            "w-full text-wrap break-words whitespace-normal",
                            task.completed && "line-through text-muted-foreground"
                        )}>

                            {task.text}
                        </h1>
                    </div>

                    {/* Priority circle */}
                    <div className={`${task.priority ? `flex` : `hidden`} rounded-full bg-red-500 w-2 h-2 p-1 ml-2 mr-1`}></div>

                    {/* ButtonMenu */}
                    <div className="">
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