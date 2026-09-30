import type { Group, NoteDataTree, Section, Task } from "@/types/types"
import {
    buildGroup, buildSection, buildTask, findGroup, findSection, findTask,
    insertGroup, insertSection, insertTask, moveSection, moveTask,
    patchGroup, patchSection, patchTask, removeGroup, removeSection, removeTask,
    type GroupPatch, type SectionPatch, type TaskParent,
} from "./note-tree-ops"

/** Undoes an optimistic update (to call when the persist fails). It is a no-op when the update did not apply. */
export type Rollback = () => void

/**
 * Optimistic actions on the active note. Every action applies the change to the cached tree at once and returns
 * the function that undoes it; an action that cannot apply (item not found, no active note) changes nothing.
 * @category ActiveNote Context
 */
export type NoteOptimisticActions = {
    patchGroup: (groupId: number, patch: GroupPatch) => Rollback
    patchSection: (sectionId: number, patch: SectionPatch) => Rollback
    patchTask: (taskId: number, patch: Partial<Task>) => Rollback
    /** Inserts a group at `index` (default: the end). */
    insertGroup: (group: Group, index?: number) => Rollback
    insertSection: (groupId: number, section: Section, index?: number) => Rollback
    /** Inserts a task at the top level of a section (`{ sectionId }`) or under a task (`{ parentTaskId }`). */
    insertTask: (parent: TaskParent, task: Task, index?: number) => Rollback
    removeGroup: (groupId: number) => Rollback
    removeSection: (sectionId: number) => Rollback
    removeTask: (taskId: number) => Rollback
    /**
     * Appends the row just created by the database (`id` is the id it returned) to the note, with the defaults of
     * the database columns. When it cannot apply (id missing, or parent not in the cache) the note is reloaded in background.
     */
    appendGroup: (id: number, noteId: number, name: string) => Rollback
    appendSection: (id: number, groupId: number, title: string) => Rollback
    appendTask: (id: number, parent: TaskParent, text: string) => Rollback
    /** Same semantics as the database move: `index` counts the destination siblings without the moved item. */
    applySectionMove: (sectionId: number, targetGroupId: number, index: number) => Rollback
    applyTaskMove: (taskId: number, target: { sectionId: number, parentTaskId: number | null }, index: number) => Rollback
}

/**
 * The actions as built here: the appends return null when they could not apply (the provider then reloads the note).
 * @category ActiveNote Context
 */
export type BaseNoteOptimisticActions = Omit<NoteOptimisticActions, "appendGroup" | "appendSection" | "appendTask"> & {
    [K in "appendGroup" | "appendSection" | "appendTask"]: (...args: Parameters<NoteOptimisticActions[K]>) => Rollback | null
}

/**
 * Access of the optimistic actions to the note cache.
 * `commit` must invalidate the in-flight reloads of the note (they would overwrite the optimistic data).
 * @category ActiveNote Context
 */
export type NoteTreeStore = {
    /** The id and cached tree of the active note, null without active note or cached data. */
    active: () => { id: number, tree: NoteDataTree } | null
    get: (noteId: number) => NoteDataTree | undefined
    commit: (noteId: number, tree: NoteDataTree) => void
}

const noop: Rollback = () => {}

/** Picks the keys of `patch` from `source` (the values a rollback has to restore). */
function previousValues<T extends object>(source: T, patch: object): Partial<T> {
    const previous: Partial<T> = {}
    for (const key of Object.keys(patch) as (keyof T)[]) previous[key] = source[key]
    return previous
}

/**
 * Builds the optimistic actions on top of a note cache.
 * @param store The cache access.
 * @returns The actions.
 * @category ActiveNote Context
 */
export function createNoteOptimisticActions(store: NoteTreeStore): BaseNoteOptimisticActions {
    /** Applies `forward` to the active tree; the returned rollback applies `inverse` to the latest tree of the same note. */
    const tryApply = (
        forward: (tree: NoteDataTree) => NoteDataTree,
        inverse: (tree: NoteDataTree) => NoteDataTree,
    ): Rollback | null => {
        const current = store.active()
        if (!current) return null
        const next = forward(current.tree)
        if (next === current.tree) return null
        store.commit(current.id, next)
        return () => {
            const latest = store.get(current.id)
            if (latest) store.commit(current.id, inverse(latest))
        }
    }
    const apply = (forward: (tree: NoteDataTree) => NoteDataTree, inverse: (tree: NoteDataTree) => NoteDataTree): Rollback =>
        tryApply(forward, inverse) ?? noop
    const lookup = <T,>(find: (tree: NoteDataTree) => T | undefined): T | undefined => {
        const current = store.active()
        return current ? find(current.tree) : undefined
    }

    return {
        patchGroup: (groupId, patch) => {
            const found = lookup(t => findGroup(t, groupId))
            if (!found) return noop
            const previous = previousValues(found.group, patch)
            return apply(t => patchGroup(t, groupId, patch), t => patchGroup(t, groupId, previous))
        },
        patchSection: (sectionId, patch) => {
            const found = lookup(t => findSection(t, sectionId))
            if (!found) return noop
            const previous = previousValues(found.section, patch)
            return apply(t => patchSection(t, sectionId, patch), t => patchSection(t, sectionId, previous))
        },
        patchTask: (taskId, patch) => {
            const found = lookup(t => findTask(t, taskId))
            if (!found) return noop
            const previous = previousValues(found.task, patch)
            return apply(t => patchTask(t, taskId, patch), t => patchTask(t, taskId, previous))
        },

        insertGroup: (group, index) =>
            apply(t => insertGroup(t, group, index), t => removeGroup(t, group.id)),
        insertSection: (groupId, section, index) =>
            apply(t => insertSection(t, groupId, section, index), t => removeSection(t, section.id)),
        insertTask: (parent, task, index) =>
            apply(t => insertTask(t, parent, task, index), t => removeTask(t, task.id)),

        removeGroup: groupId => {
            const found = lookup(t => findGroup(t, groupId))
            if (!found) return noop
            return apply(t => removeGroup(t, groupId), t => insertGroup(t, found.group, found.index))
        },
        removeSection: sectionId => {
            const found = lookup(t => findSection(t, sectionId))
            if (!found) return noop
            return apply(t => removeSection(t, sectionId), t => insertSection(t, found.groupId, found.section, found.index))
        },
        removeTask: taskId => {
            const found = lookup(t => findTask(t, taskId))
            if (!found) return noop
            return apply(t => removeTask(t, taskId), t => insertTask(t, found.parent, found.task, found.index))
        },

        appendGroup: (id, noteId, name) => Number.isInteger(id) ? tryApply(
            t => insertGroup(t, buildGroup(id, noteId, name, t.groups)),
            t => removeGroup(t, id)) : null,
        appendSection: (id, groupId, title) => Number.isInteger(id) ? tryApply(
            t => {
                const group = findGroup(t, groupId)
                return group ? insertSection(t, groupId, buildSection(id, groupId, title, group.group.sections)) : t
            },
            t => removeSection(t, id)) : null,
        appendTask: (id, parent, text) => Number.isInteger(id) ? tryApply(
            t => {
                if ("sectionId" in parent) {
                    const section = findSection(t, parent.sectionId)
                    return section ? insertTask(t, parent, buildTask(id, parent.sectionId, null, text, section.section.tasks)) : t
                }
                const found = findTask(t, parent.parentTaskId)
                return found ? insertTask(t, parent, buildTask(id, found.task.sectionID, parent.parentTaskId, text, found.task.subtasks)) : t
            },
            t => removeTask(t, id)) : null,

        applySectionMove: (sectionId, targetGroupId, index) => {
            const found = lookup(t => findSection(t, sectionId))
            if (!found) return noop
            return apply(
                t => moveSection(t, sectionId, targetGroupId, index),
                t => moveSection(t, sectionId, found.groupId, found.index))
        },
        applyTaskMove: (taskId, target, index) => {
            const found = lookup(t => findTask(t, taskId))
            if (!found) return noop
            const origin = "parentTaskId" in found.parent
                ? { sectionId: found.task.sectionID ?? target.sectionId, parentTaskId: found.parent.parentTaskId }
                : { sectionId: found.parent.sectionId, parentTaskId: null }
            return apply(t => moveTask(t, taskId, target, index), t => moveTask(t, taskId, origin, found.index))
        },
    }
}
