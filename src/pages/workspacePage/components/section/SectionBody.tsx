import { useTranslation } from "react-i18next"
import type { Section, Task as TaskType } from "@/types/types"
import { usePreferences } from "@/contexts/use-preferences"
import { AddTask } from "../tasks/AddTask"
import { Task } from "../tasks/Task"
import { countHiddenCompleted, visibleTasks } from "./hide-completed"

type SectionBodyProps = {
    isOpen: boolean
    section: Section
}

// Tasks are nested recursively: subtasks (at any depth) are rendered inside their parent. A hidden completed task takes
// its whole subtree with it; the Task still receives the full task (its progress counts every subtask).
const renderTask = (task: TaskType, hideCompleted: boolean): React.ReactNode => (
    <Task key={task.id} task={task}>
        {visibleTasks(task.subtasks, hideCompleted).map(subtask => renderTask(subtask, hideCompleted))}
    </Task>
)

export const SectionBody = ({ isOpen, section }: SectionBodyProps) => {
    const { t } = useTranslation()
    const { hideCompletedTasks } = usePreferences()
    const hiddenCount = hideCompletedTasks ? countHiddenCompleted(section.tasks) : 0

    return (
        <div className={`flex flex-col w-full overflow-hidden dark:bg-secondary bg-background ${isOpen ? 'h-full opacity-100' : 'max-h-0 opacity-0'}`}>
            {visibleTasks(section.tasks, hideCompletedTasks).map(task => renderTask(task, hideCompletedTasks))}
            {hiddenCount > 0 &&
                <p className="px-2 py-1 text-xs text-muted-foreground" data-testid="hidden-completed">
                    {t("tasks.hiddenCompleted", { count: hiddenCount })}
                </p>}
            <AddTask sectionId={section.id} />
        </div>
    )
}
