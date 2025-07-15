import { Checkbox } from "@/components/ui/checkbox"
import type { Task as TaskType } from "@/types"
import { useState } from "react"
import { ButtonMenuTask } from "./ButtonMenuTask"

type TaskProps = {
    task: TaskType
    children?: React.ReactNode
}

export const Task = ({ task, children }: TaskProps) => {
    const [isChecked, setIsChecked] = useState(task.isCompleted)

    const handleCheckedChange = (checked: boolean) => {
        setIsChecked(checked)
    }

    return (
        <div className="flex flex-col items-center w-full">

            <div className="flex items-center w-full border-b">
                {/* Color Container */}
                {task.color && <div className="w-1 self-stretch" style={{ backgroundColor: task.color }}></div>}

                {/* Task items container */}
                <div className="group flex items-center justify-between w-full p-2">

                    {/* Checkbox && text container */}
                    <div className="flex items-center gap-2 ml-1 w-full">
                        <Checkbox
                            checked={isChecked}
                            onCheckedChange={handleCheckedChange}
                            className="cursor-pointer"
                        />
                        <h1 className={`${isChecked ? 'line-through text-muted-foreground' : ''} w-full text-wrap break-words whitespace-normal`}>
                            {task.text}
                        </h1>
                    </div>
                    <div className={`${task.priority ? `flex` : `flex`} rounded-full bg-red-500 w-2 h-2`}></div>
                    <div className="flex items-center justify-center hover:bg-secondary">
                        <ButtonMenuTask taskId={task.id} />
                    </div>
                </div>
            </div>
            <div className="flex items-center w-full pl-6">
                {children}
            </div>
        </div >
    )
}