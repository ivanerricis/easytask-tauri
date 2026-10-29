import type { Group, NoteDataTree, Section, Task } from "@/types/types"
import { orderedItems } from "@/lib/group-sections"
import {
    buildGroup, buildSection, buildTask, findGroup, findSection, findTask,
    insertGroup, insertSection, insertTask, moveDirectSection, moveSection, moveTask,
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
    appendGroup: (id: number, noteId: number, name: string, defaultSectionId: number) => Rollback
    appendSection: (id: number, groupId: number, title: string) => Rollback
    /** `index` is the place among all the siblings, the completed ones hidden by the view included (default: the end). */
    appendTask: (id: number, parent: TaskParent, text: string, index?: number) => Rollback
    /** Same semantics as the database move: `index` counts the destination siblings without the moved item. */
    applySectionMove: (sectionId: number, targetGroupId: number, index: number, beforeList?: boolean) => Rollback
    /** Moves the list of the direct tasks of a group before the `index`-th section with a header (after all of them when `index` is not less than their number). */
    applyDirectSectionMove: (groupId: number, index: number) => Rollback
    /**
     * Moves a section into the new group the database just created (`groupId`, with its default section `defaultSectionId`)
     * at `index` among the groups.
     * When it cannot apply (id missing, section not in the cache) the note is reloaded in background.
     */
    applySectionMoveToNewGroup: (sectionId: number, groupId: number, index: number, defaultSectionId: number) => Rollback
    applyTaskMove: (taskId: number, target: { sectionId: number, parentTaskId: number | null }, index: number) => Rollback
}

type FallibleActions = "appendGroup" | "appendSection" | "appendTask" | "applySectionMoveToNewGroup"

/**
 * The actions as built here: the appends return null when they could not apply (the provider then reloads the note).
 * @category ActiveNote Context
 */
type BaseNoteOptimisticActions = Omit<NoteOptimisticActions, FallibleActions> & {
    [K in FallibleActions]: (...args: Parameters<NoteOptimisticActions[K]>) => Rollback | null
}

/**
 * Access of the optimistic actions to the note cache.
 * `commit` must invalidate the in-flight reloads of the note (they would overwrite the optimistic data).
 * @category ActiveNote Context
 */
type NoteTreeStore = {
    /** The id and cached tree of the active note, null without active note or cached data. */
    active: () => { id: number, tree: NoteDataTree } | null
    get: (noteId: number) => NoteDataTree | undefined
    commit: (noteId: number, tree: NoteDataTree) => void
}

const noop: Rollback = () => {}

/** Puts back the `defaultIndex` that the groups had (the place of the list among the sections cannot be rebuilt from a section index alone). */
function restoreDefaultIndexes(tree: NoteDataTree, indexes: ReadonlyMap<number, number | undefined>): NoteDataTree {
    return { groups: tree.groups.map(group => indexes.has(group.id) && group.defaultIndex !== indexes.get(group.id)
        ? { ...group, defaultIndex: indexes.get(group.id) }
        : group) }
}

/** The `defaultIndex` of the given groups of a tree (see restoreDefaultIndexes). */
function defaultIndexesOf(tree: NoteDataTree | undefined, ...groupIds: number[]): Map<number, number | undefined> {
    return new Map(groupIds.map(id => [id, tree?.groups.find(group => group.id === id)?.defaultIndex]))
}

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
            const before = new Map([[found.groupId, lookup(t => findGroup(t, found.groupId))?.group.defaultIndex]])
            return apply(t => removeSection(t, sectionId), t => restoreDefaultIndexes(insertSection(t, found.groupId, found.section, found.index), before))
        },
        removeTask: taskId => {
            const found = lookup(t => findTask(t, taskId))
            if (!found) return noop
            return apply(t => removeTask(t, taskId), t => insertTask(t, found.parent, found.task, found.index))
        },

        appendGroup: (id, noteId, name, defaultSectionId) => Number.isInteger(id) && Number.isInteger(defaultSectionId) ? tryApply(
            t => insertGroup(t, buildGroup(id, noteId, name, t.groups, defaultSectionId)),
            t => removeGroup(t, id)) : null,
        appendSection: (id, groupId, title) => Number.isInteger(id) ? tryApply(
            t => {
                const group = findGroup(t, groupId)
                // The new section is numbered after every row of the group, the list of the direct tasks included
                return group ? insertSection(t, groupId, buildSection(id, groupId, title, orderedItems(group.group))) : t
            },
            t => removeSection(t, id)) : null,
        appendTask: (id, parent, text, index) => Number.isInteger(id) ? tryApply(
            t => {
                if ("sectionId" in parent) {
                    const section = findSection(t, parent.sectionId)
                    return section ? insertTask(t, parent, buildTask(id, parent.sectionId, null, text, section.section.tasks), index) : t
                }
                const found = findTask(t, parent.parentTaskId)
                return found ? insertTask(t, parent, buildTask(id, found.task.sectionID, parent.parentTaskId, text, found.task.subtasks), index) : t
            },
            t => removeTask(t, id)) : null,

        applySectionMove: (sectionId, targetGroupId, index, beforeList) => {
            const found = lookup(t => findSection(t, sectionId))
            if (!found) return noop
            const before = defaultIndexesOf(lookup(t => t), found.groupId, targetGroupId)
            return apply(
                t => moveSection(t, sectionId, targetGroupId, index, beforeList),
                t => restoreDefaultIndexes(moveSection(t, sectionId, found.groupId, found.index), before))
        },
        applyDirectSectionMove: (groupId, index) => {
            const before = defaultIndexesOf(lookup(t => t), groupId)
            return apply(t => moveDirectSection(t, groupId, index), t => restoreDefaultIndexes(t, before))
        },
        applySectionMoveToNewGroup: (sectionId, groupId, index, defaultSectionId) => {
            const found = lookup(t => findSection(t, sectionId))
            if (!found || found.index < 0 || !Number.isInteger(groupId) || !Number.isInteger(defaultSectionId)) return null
            const before = defaultIndexesOf(lookup(t => t), found.groupId)
            return tryApply(
                t => {
                    const origin = findGroup(t, found.groupId)
                    if (!origin) return t
                    const group: Group = { ...buildGroup(groupId, origin.group.noteID, null, [], defaultSectionId), position: index }
                    return moveSection(insertGroup(t, group, index), sectionId, groupId, 0)
                },
                t => removeGroup(restoreDefaultIndexes(moveSection(t, sectionId, found.groupId, found.index), before), groupId))
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
