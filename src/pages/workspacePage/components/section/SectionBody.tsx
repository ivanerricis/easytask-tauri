import { memo } from "react"
import { useTranslation } from "react-i18next"
import type { Section } from "@/types/types"
import { usePreferences } from "@/contexts/use-preferences"
import { AddTask } from "../tasks/AddTask"
import { Task } from "../tasks/Task"
import { countHiddenCompleted, visibleTasks } from "./hide-completed"

type SectionBodyProps = {
    isOpen: boolean
    section: Section
}

// Tasks are nested recursively: each Task renders its own subtasks (at any depth), so its memo holds. Only a fully completed
// subtree is hidden (see isHiddenTask): a completed task with an open descendant stays, and its subtasks are filtered by the
// same rule. The Task still receives the full task (its progress counts every subtask).
export const SectionBody = memo(({ isOpen, section }: SectionBodyProps) => {
    const { t } = useTranslation()
    const { hideCompletedTasks, showSubtaskCount = true } = usePreferences()
    const hiddenCount = hideCompletedTasks ? countHiddenCompleted(section.tasks) : 0

    return (
        <div className={`flex flex-col w-full overflow-hidden dark:bg-secondary bg-background ${isOpen ? 'h-full' : 'hidden'}`}>
            {visibleTasks(section.tasks, hideCompletedTasks).map(task => <Task key={task.id} task={task} showSubtaskCount={showSubtaskCount} hideCompleted={hideCompletedTasks} />)}
            {hiddenCount > 0 &&
                <p className="px-2 py-1 text-xs text-muted-foreground" data-testid="hidden-completed">
                    {t("tasks.hiddenCompleted", { count: hiddenCount })}
                </p>}
            <AddTask sectionId={section.id} />
        </div>
    )
})
