import type { Section, Task as TaskType } from "@/types/types"
import { AddTask } from "../tasks/AddTask"
import { Task } from "../tasks/Task"

type SectionBodyProps = {
    isOpen: boolean
    section: Section
}

// Tasks are nested recursively: subtasks (at any depth) are rendered inside their parent
const renderTask = (task: TaskType) => (
    <Task key={task.id} task={task}>
        {task.subtasks.map(renderTask)}
    </Task>
)

export const SectionBody = ({ isOpen, section }: SectionBodyProps) => {
    return (
        <div className={`flex flex-col w-full overflow-hidden dark:bg-secondary bg-background ${isOpen ? 'h-full opacity-100' : 'max-h-0 opacity-0'}`}>
            {section.tasks.map(renderTask)}
            <AddTask sectionId={section.id} />
        </div>
    )
}
