import type { NoteDataTree, Task } from "@/types/types"
import type { TxStatement } from "@/db/transaction"
import { buildPositionUpdate } from "@/db/queries/ordering"
import { findSection, findTask, moveTask, patchTask } from "@/contexts/note-tree-ops"

/** The persisted state of a task: where it is (`s<id>` = top level of a section, `t<id>` = under a task) and its flags. */
type TaskState = {
    container: string
    index: number
    sectionId: number | null
    completed: boolean
    priority: boolean
    color: string | null
}

type Flat = { tasks: Map<number, TaskState>, containers: Map<string, number[]> }

function flatten(tree: NoteDataTree): Flat {
    const tasks = new Map<number, TaskState>()
    const containers = new Map<string, number[]>()
    const visit = (list: Task[], container: string, sectionId: number) => {
        containers.set(container, list.map(task => task.id))
        list.forEach((task, index) => {
            tasks.set(task.id, {
                container, index, sectionId,
                completed: !!task.completed, priority: !!task.priority, color: task.color ?? null,
            })
            visit(task.subtasks, `t${task.id}`, sectionId)
        })
    }
    for (const group of tree.groups)
        for (const section of group.sections) visit(section.tasks, `s${section.id}`, section.id)
    return { tasks, containers }
}

const sameList = (a: readonly number[], b: readonly number[]) => a.length === b.length && a.every((id, i) => id === b[i])

/**
 * The statements that bring the tasks of the database from `before` to `after` (two versions of the same note):
 * - a task with a new parent gets it with its whole subtree (trashed descendants included, like moveDBTask);
 * - only the flags that changed are written (the edit timestamp trigger fires on the written columns);
 * - every task list whose order changed is renumbered.
 * Tasks present in only one of the trees are ignored.
 * @category Automations
 */
export function diffTaskStatements(before: NoteDataTree, after: NoteDataTree): TxStatement[] {
    const previous = flatten(before)
    const next = flatten(after)
    const statements: TxStatement[] = []

    for (const [id, state] of next.tasks) {
        const old = previous.tasks.get(id)
        if (!old) continue
        if (old.container !== state.container) {
            const parentTaskId = state.container.startsWith("t") ? Number(state.container.slice(1)) : null
            statements.push({
                sql: `WITH RECURSIVE subtree AS (
                    SELECT id FROM task WHERE taskID = ?
                    UNION
                    SELECT t.id FROM task t INNER JOIN subtree s ON t.taskID = s.id
                )
                UPDATE task SET
                    sectionID = ?,
                    taskID = CASE WHEN id = ? THEN ? ELSE taskID END
                WHERE id IN (SELECT id FROM subtree) OR id = ?`,
                params: [id, state.sectionId, id, parentTaskId, id],
            })
        }
        const sets: string[] = []
        const params: unknown[] = []
        if (old.completed !== state.completed) { sets.push("completed = ?"); params.push(state.completed ? 1 : 0) }
        if (old.priority !== state.priority) { sets.push("priority = ?"); params.push(state.priority ? 1 : 0) }
        if (old.color !== state.color) { sets.push("color = ?"); params.push(state.color) }
        if (sets.length > 0) statements.push({ sql: `UPDATE task SET ${sets.join(", ")} WHERE id = ?`, params: [...params, id] })
    }

    for (const [container, ids] of next.containers) {
        const old = previous.containers.get(container)
        if (ids.length === 0 || (old && sameList(old, ids))) continue
        statements.push(buildPositionUpdate("task", ids))
    }
    return statements
}

/**
 * What an automation changed on a task: its place (parent or index) and/or some of its flags.
 * @category Automations
 */
export type TaskChange = { id: number, place: boolean, completed: boolean, priority: boolean, color: boolean }

/**
 * What changed between two versions of a note on the given tasks (those an automation acted on); tasks missing from
 * a tree or left unchanged are omitted.
 * @category Automations
 */
export function taskChanges(before: NoteDataTree, after: NoteDataTree, ids: readonly number[]): TaskChange[] {
    const previous = flatten(before).tasks
    const next = flatten(after).tasks
    const changes: TaskChange[] = []
    for (const id of ids) {
        const old = previous.get(id)
        const state = next.get(id)
        if (!old || !state) continue
        const change = {
            id,
            place: old.container !== state.container || old.index !== state.index,
            completed: old.completed !== state.completed,
            priority: old.priority !== state.priority,
            color: old.color !== state.color,
        }
        if (change.place || change.completed || change.priority || change.color) changes.push(change)
    }
    return changes
}

/**
 * Gives some tasks of `current` what they have in `source` (used to undo/redo an automation on the latest note, which
 * may have changed since): only the parts in `changes`, so a later edit of another field is kept. A task, or a
 * destination, that is no longer in `current` is skipped.
 * @category Automations
 */
export function restoreTasks(current: NoteDataTree, source: NoteDataTree, changes: readonly TaskChange[]): NoteDataTree {
    const located = changes
        .map(change => ({ change, found: findTask(source, change.id) }))
        .filter((item): item is { change: TaskChange, found: NonNullable<ReturnType<typeof findTask>> } => item.found !== undefined)
        // Lower indexes first, so that an insertion does not shift a place restored before it
        .sort((a, b) => a.found.index - b.found.index)

    let tree = current
    for (const { change, found: { task, parent, index } } of located) {
        if (!findTask(tree, task.id)) continue
        if (change.place) {
            if ("sectionId" in parent) {
                if (findSection(tree, parent.sectionId)) tree = moveTask(tree, task.id, { sectionId: parent.sectionId, parentTaskId: null }, index)
            } else {
                const parentTask = findTask(tree, parent.parentTaskId)
                const sectionId = parentTask?.task.sectionID
                if (parentTask && sectionId != null) tree = moveTask(tree, task.id, { sectionId, parentTaskId: parent.parentTaskId }, index)
            }
        }
        const patch: Partial<Task> = {}
        if (change.completed) patch.completed = !!task.completed
        if (change.priority) patch.priority = !!task.priority
        if (change.color) patch.color = task.color ?? null
        if (Object.keys(patch).length > 0) tree = patchTask(tree, task.id, patch)
    }
    return tree
}
