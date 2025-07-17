import { Progress } from "@/components/ui/progress"
import type { Section as SectionType, Task } from "@/types"
import { ChevronDown, Grip } from "lucide-react"
import { ButtonMenuSection } from "./ButtonMenuSection"

type SectionHeaderProps = {
    isOpen: boolean
    onOpenChange: (isOpen: boolean) => void
    section: SectionType
    dragHandleProps?: any
}

const calculateCompletionPercentage = (tasks: Task[]): number => {
    const totalTasks = tasks.length
    if (totalTasks === 0) return 100

    const completedTasks = tasks.reduce((acc, task) => {
        const isTaskCompleted = task.completed ||
            (task.subtasks.length > 0 && task.subtasks.every(subtask => subtask.completed))
        return acc + (isTaskCompleted ? 1 : 0)
    }, 0)

    return (completedTasks / totalTasks) * 100
}

export const SectionHeader = ({ isOpen, onOpenChange, section, dragHandleProps }: SectionHeaderProps) => {

    const handleOpen = () => {
        onOpenChange(!isOpen)
    }

    const completionPercentage = calculateCompletionPercentage(section.tasks)

    return (
        <div className="relative flex flex-col items-center justify-center">

            {/* Color Container */}
            {section.color && <div className="w-full h-0.5 absolute top-0" style={{ backgroundColor: section.color }}></div>}
            <div
                className="group flex items-center w-full p-2 whitespace-nowrap"
            >
                {dragHandleProps && <div className="group flex items-center justify-center"
                    {...dragHandleProps}
                >
                    <Grip className="text-muted-foreground group-hover:text-foreground w-4 h-4" />
                </div>}
                {(section.tasks.length > 0) &&
                    <div role="button" onClick={handleOpen} className="shrink-0">
                        <ChevronDown className={`${isOpen ? "rotate-0" : "-rotate-90"} transition-all ml-1`} />
                    </div>}
                <div className="flex items-center justify-between gap-2 w-full">
                    <h1 className="text-sm font-medium ml-2 shrink-0">
                        {section.title}
                    </h1>
                    <div className="flex items-center gap-2 shrink-0 min-w-[8rem]">
                        <Progress className="w-20" value={completionPercentage} />
                        <h1 className="text-xs">
                            {Math.round(completionPercentage)} %
                        </h1>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100">
                        <ButtonMenuSection sectionId={section.id} />
                    </div>
                </div>
            </div>
        </div>
    )
}
