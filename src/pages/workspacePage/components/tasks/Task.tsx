import { Checkbox } from "@/components/ui/checkbox"
import type { Task as TaskType } from "@/types"
import { ButtonMenuTask } from "./ButtonMenuTask"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import { toast } from "sonner"
import { useEffect } from "react"

type TaskProps = {
    task: TaskType
    children?: React.ReactNode
}

export const Task = ({ task, children }: TaskProps) => {
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

    useEffect(() => {
        console.log("CHECKED VALUE:", task.completed, typeof task.completed)
    })

    return (
        <div className="flex flex-col items-center w-full">

            <div className="flex items-center w-full border-b relative">
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
                        <h1 className={`${task.completed ? 'line-through text-muted-foreground' : ''} w-full text-wrap break-words whitespace-normal`}>
                            {task.text}
                        </h1>
                    </div>

                    {/* Priority circle */}
                    <div className={`${task.priority ? `flex` : `hidden`} rounded-full bg-red-500 w-2 h-2 p-1 ml-2 mr-1`}></div>

                    {/* ButtonMenu */}
                    <div className="flex items-center justify-center hover:bg-secondary opacity-0 group-hover:opacity-100">
                        <ButtonMenuTask task={task} />
                    </div>
                </div>
            </div>
            <div className="flex items-center w-full pl-6">
                {children}
            </div>
        </div >
    )
}