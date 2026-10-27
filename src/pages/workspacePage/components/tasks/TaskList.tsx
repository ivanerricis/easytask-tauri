import { memo } from "react"
import { useTranslation } from "react-i18next"
import type { Task as TaskType } from "@/types/types"
import { usePreferences } from "@/contexts/use-preferences"
import { Task } from "./Task"
import { useTaskDensity } from "./task-density"
import { countHiddenCompleted, visibleTasks } from "../section/hide-completed"

type TaskListProps = {
    /** The top level tasks of a section (the default section of a group included), in order. */
    tasks: TaskType[]
}

/**
 * The rows of the top level tasks of a section, with the "hide completed" rule and its "N hidden" note.
 * Tasks are nested recursively: each Task renders its own subtasks (at any depth), so its memo holds. Only a fully completed
 * subtree is hidden (see isHiddenTask): a completed task with an open descendant stays, and its subtasks are filtered by the
 * same rule. The Task still receives the full task (its progress counts every subtask).
 * @category Note
 */
export const TaskList = memo(({ tasks }: TaskListProps) => {
    const { t } = useTranslation()
    const { hideCompletedTasks, showSubtaskCount = true, renameOnClick = true } = usePreferences()
    const density = useTaskDensity()
    const hiddenCount = hideCompletedTasks ? countHiddenCompleted(tasks) : 0

    return (
        <>
            {visibleTasks(tasks, hideCompletedTasks).map(task => <Task key={task.id} task={task} showSubtaskCount={showSubtaskCount} hideCompleted={hideCompletedTasks} renameOnClick={renameOnClick} density={density} />)}
            {hiddenCount > 0 &&
                <p className="px-2 py-1 text-xs text-muted-foreground" data-testid="hidden-completed">
                    {t("tasks.hiddenCompleted", { count: hiddenCount })}
                </p>}
        </>
    )
})
