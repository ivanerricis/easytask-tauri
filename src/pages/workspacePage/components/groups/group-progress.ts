import type { Group, Task } from "@/types/types"

const countTasks = (tasks: Task[]): { done: number, total: number } => {
    let done = 0
    let total = 0
    for (const task of tasks) {
        total += 1
        if (task.completed) done += 1
        const nested = countTasks(task.subtasks ?? [])
        done += nested.done
        total += nested.total
    }
    return { done, total }
}

/** Completion of a group: every task and every subtask counts as one unit. */
export const getGroupProgress = (group: Group): { done: number, total: number, percent: number } => {
    let done = 0
    let total = 0
    for (const section of group.sections) {
        const counts = countTasks(section.tasks)
        done += counts.done
        total += counts.total
    }
    return { done, total, percent: total === 0 ? 0 : (done / total) * 100 }
}
