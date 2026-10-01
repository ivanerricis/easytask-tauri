import type { Task } from "@/types/types"

/**
 * The tasks to render: with `hide` on, the completed ones are left out (together with their whole subtree).
 * The list is the same array when nothing is hidden. Only a view: the tree (and every move index) stays complete.
 * @category Note
 */
export const visibleTasks = (tasks: Task[], hide: boolean): Task[] =>
    hide ? tasks.filter(task => !task.completed) : tasks

const countCompleted = (tasks: Task[]): number =>
    tasks.reduce((sum, task) => sum + (task.completed ? 1 : 0) + countCompleted(task.subtasks ?? []), 0)

/**
 * How many completed tasks are hidden by `visibleTasks(…, true)` in a list, counting the completed subtasks
 * of a hidden task but not the ones that are still open.
 * @category Note
 */
export const countHiddenCompleted = (tasks: Task[]): number =>
    tasks.reduce((sum, task) => sum + (task.completed ? 1 + countCompleted(task.subtasks ?? []) : countHiddenCompleted(task.subtasks ?? [])), 0)
