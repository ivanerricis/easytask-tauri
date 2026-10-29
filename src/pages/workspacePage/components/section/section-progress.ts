import type { Task } from "@/types/types"

/**
 * Percentage shown by the progress bar of a section: only its top-level tasks count (one unit each), and a task is done when it
 * is completed or when it has subtasks that are all completed. A section without tasks is 100%.
 *
 * It is deliberately not the definition of the group progress (`getGroupProgress`), where every nested subtask is a unit of its
 * own and an empty group is 0%.
 */
export const getSectionCompletionPercent = (tasks: Task[]): number => {
    if (tasks.length === 0) return 100

    const done = tasks.filter(task => task.completed || (task.subtasks.length > 0 && task.subtasks.every(subtask => subtask.completed))).length
    return (done / tasks.length) * 100
}
