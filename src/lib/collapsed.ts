import type { NoteDataTree, Section, Task } from "@/types/types"

/** Anything that carries the saved open/closed state (a group, a section or a task; SQLite gives 0/1, the app true/false). */
export type MaybeCollapsed = { collapsed?: boolean | number | null } | null | undefined

/**
 * Whether an element is saved as closed: `collapsed` can be true/false or 0/1 from the database, and is absent on
 * elements built before the column was loaded (then open).
 * @category Note
 */
export const isCollapsed = (item: MaybeCollapsed): boolean => Boolean(item?.collapsed)

/** The ids of the closed elements of a note. */
export type CollapsedIds = { groups: ReadonlySet<number>, sections: ReadonlySet<number>, tasks: ReadonlySet<number> }

const cache = new WeakMap<NoteDataTree, CollapsedIds>()

/**
 * The ids of the closed groups, sections and tasks of a note (subtasks at any depth, the list of the direct tasks
 * included). Computed once per tree object: a lookup per row stays O(1) however many rows ask.
 * @category Note
 */
export function collapsedIds(tree: NoteDataTree): CollapsedIds {
    const cached = cache.get(tree)
    if (cached) return cached
    const groups = new Set<number>()
    const sections = new Set<number>()
    const tasks = new Set<number>()
    const visitTasks = (list: Task[] | undefined) => {
        for (const task of list ?? []) {
            if (isCollapsed(task)) tasks.add(task.id)
            visitTasks(task.subtasks)
        }
    }
    const visitSection = (section: Section) => {
        if (isCollapsed(section)) sections.add(section.id)
        visitTasks(section.tasks)
    }
    for (const group of tree.groups) {
        if (isCollapsed(group)) groups.add(group.id)
        if (group.defaultSection) visitSection(group.defaultSection)
        group.sections.forEach(visitSection)
    }
    const result = { groups, sections, tasks }
    cache.set(tree, result)
    return result
}
