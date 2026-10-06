import type { NoteDataTree } from "@/types/types"
import { findGroup, indexTree, type SectionTarget, type TaskTarget } from "./note-dnd"
import { isHiddenTask } from "./section/hide-completed"

/** One step of the "Sposta su / giù" menu items: towards the start (-1) or the end (+1) of the siblings. */
export type Step = -1 | 1

/**
 * Index to move `id` to for one step among `siblings` (the semantics of the move actions: the final index among the
 * siblings once the item has been moved). The item jumps over the nearest sibling that is shown in that direction, so
 * hidden siblings (completed tasks while they are hidden) are skipped instead of making the step look like a no-op.
 * Null when there is nothing to jump over (first or last).
 */
function stepIndex<T extends { id: number }>(siblings: T[], id: number, step: Step, isShown: (item: T) => boolean): number | null {
    const from = siblings.findIndex(item => item.id === id)
    if (from < 0) return null
    for (let index = from + step; index >= 0 && index < siblings.length; index += step) {
        // The siblings before the item keep their index once it is removed; the ones after it shift down by one,
        // so "after sibling `index`" is `index` again
        if (isShown(siblings[index])) return index
    }
    return null
}

/**
 * Destination of a task (or subtask) moved one step among its siblings, null when it is already first/last.
 * @param hideCompleted Siblings hidden by the "hide completed" rule (isHiddenTask) are not on screen, so they are jumped over.
 * @category Note DnD
 */
export function getTaskStep(tree: NoteDataTree, taskId: number, step: Step, hideCompleted: boolean): TaskTarget | null {
    const { tasks, sections } = indexTree(tree)
    const info = tasks.get(taskId)
    if (!info) return null
    const siblings = info.parentId === null
        ? sections.get(info.sectionId)?.section.tasks ?? []
        : tasks.get(info.parentId)?.task.subtasks ?? []
    const index = stepIndex(siblings, taskId, step, task => !isHiddenTask(task, hideCompleted))
    return index === null ? null : { sectionId: info.sectionId, parentTaskId: info.parentId, index }
}

/** Destination of a section moved one step among the sections of its group, null when it is already first/last. */
export function getSectionStep(tree: NoteDataTree, sectionId: number, step: Step): SectionTarget | null {
    const { sections } = indexTree(tree)
    const info = sections.get(sectionId)
    if (!info) return null
    const group = tree.groups.find(candidate => candidate.id === info.groupId)
    const index = stepIndex(group?.sections ?? [], sectionId, step, () => true)
    return index === null ? null : { type: "group", groupId: info.groupId, index }
}

/** Index a group is moved to for one step among the groups (sorted by position), null when it is already first/last. */
export function getGroupStep(tree: NoteDataTree, groupId: number, step: Step): number | null {
    if (!findGroup(tree, groupId)) return null
    const sorted = [...tree.groups].sort((a, b) => a.position - b.position)
    return stepIndex(sorted, groupId, step, () => true)
}
