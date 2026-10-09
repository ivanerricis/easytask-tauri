import type { Group, NoteDataTree, Section, Task } from "@/types/types"
import { buildGroup, buildSection, buildTask } from "@/contexts/note-tree-ops"
import type { Automation, AutomationAction, AutomationTrigger } from "@/lib/automations/types"

/** Compact description of a task: `{ id, subs }`; flags are optional. */
export type TaskSpec = {
    id: number
    completed?: boolean
    priority?: boolean
    color?: string | null
    subs?: TaskSpec[]
}

/**
 * Builds a one-group note: `sections` maps a section id to its top level tasks (in order).
 * Positions and the section/parent ids of the tasks are filled in like the database does.
 * @category Test helpers
 */
export function makeTree(sections: Record<number, TaskSpec[]>): NoteDataTree {
    const build = (specs: TaskSpec[], sectionId: number, parentId: number | null): Task[] => {
        const list: Task[] = []
        for (const spec of specs) {
            const task = buildTask(spec.id, sectionId, parentId, `task ${spec.id}`, list)
            list.push({
                ...task,
                completed: !!spec.completed,
                priority: !!spec.priority,
                color: spec.color ?? null,
                subtasks: build(spec.subs ?? [], sectionId, spec.id),
            })
        }
        return list
    }
    const built: Section[] = []
    for (const [id, specs] of Object.entries(sections)) {
        const section = buildSection(Number(id), 1, `S${id}`, built)
        built.push({ ...section, tasks: build(specs, Number(id), null) })
    }
    const group: Group = { ...buildGroup(1, 1, null, []), sections: built }
    return { groups: [group] }
}

/** A rule with sensible defaults (enabled, position = id). */
export function makeRule(
    id: number,
    trigger: AutomationTrigger,
    actions: AutomationAction[],
    extra: Partial<Pick<Automation, "enabled" | "position" | "name">> = {},
): Automation {
    return { id, noteId: 1, name: null, enabled: true, trigger, actions, position: id, ...extra }
}

/** The ids of the top level tasks of each section. */
export function layout(tree: NoteDataTree): Record<number, number[]> {
    const out: Record<number, number[]> = {}
    for (const group of tree.groups) for (const section of group.sections) out[section.id] = section.tasks.map(task => task.id)
    return out
}

/** Finds a task at any depth (throws when missing, to keep the assertions short). */
export function taskOf(tree: NoteDataTree, id: number): Task {
    const visit = (tasks: Task[]): Task | undefined => {
        for (const task of tasks) {
            if (task.id === id) return task
            const inner = visit(task.subtasks)
            if (inner) return inner
        }
        return undefined
    }
    for (const group of tree.groups) for (const section of group.sections) {
        const found = visit(section.tasks)
        if (found) return found
    }
    throw new Error(`task ${id} not found`)
}

/**
 * Builds a note with several groups: `groups` maps a group id to its sections (section id -> top level tasks, as in
 * `makeTree`). The groups are ordered by id; `names` optionally names some of them.
 * @category Test helpers
 */
export function makeGroups(groups: Record<number, Record<number, TaskSpec[]>>, names: Record<number, string> = {}): NoteDataTree {
    const built = Object.entries(groups).map(([id, sections], position): Group => {
        const [base] = makeTree(sections).groups
        const groupId = Number(id)
        return {
            ...base, id: groupId, position, name: names[groupId] ?? null,
            sections: base.sections.map(section => ({ ...section, groupID: groupId })),
        }
    })
    return { groups: built }
}

/** The ids of the groups of a note in note order (by position). */
export const groupIds = (tree: NoteDataTree) => [...tree.groups].sort((a, b) => a.position - b.position).map(group => group.id)
