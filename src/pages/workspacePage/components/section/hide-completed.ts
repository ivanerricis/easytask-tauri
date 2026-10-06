import type { Task } from "@/types/types"

/** Whether a task has at least one subtask, at any depth, that is not completed. */
export const hasOpenDescendant = (task: Task): boolean =>
    (task.subtasks ?? []).some(subtask => !subtask.completed || hasOpenDescendant(subtask))

/**
 * The one rule of "hide completed tasks": a task is hidden when it is completed and nothing below it is still open.
 * A completed task with an open descendant stays visible (with its completed look), so the open work is not lost;
 * its own subtasks are then filtered by the same rule. Only a fully completed subtree disappears.
 * @category Note
 */
export const isHiddenTask = (task: Task, hide: boolean): boolean =>
    hide && !!task.completed && !hasOpenDescendant(task)

/**
 * The tasks to render: with `hide` on, the ones for which `isHiddenTask` holds are left out.
 * The list is the same array when nothing is hidden. Only a view: the tree (and every move index) stays complete.
 * @category Note
 */
export const visibleTasks = (tasks: Task[], hide: boolean): Task[] =>
    hide ? tasks.filter(task => !isHiddenTask(task, true)) : tasks

const countAll = (tasks: Task[]): number =>
    tasks.reduce((sum, task) => sum + 1 + countAll(task.subtasks ?? []), 0)

/**
 * How many tasks `visibleTasks(…, true)` leaves out of a list, at any depth: a hidden task counts together with its
 * subtasks (all completed, since it is hidden), a visible one is looked into.
 * @category Note
 */
export const countHiddenCompleted = (tasks: Task[]): number =>
    tasks.reduce((sum, task) => sum + (isHiddenTask(task, true) ? 1 + countAll(task.subtasks ?? []) : countHiddenCompleted(task.subtasks ?? [])), 0)
