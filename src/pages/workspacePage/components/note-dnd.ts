import { getGroupLabel } from "./groups/group-label"
import type { Group, NoteDataTree, Section, Task } from "@/types/types"

/**
 * Pure logic of the drag & drop of sections and tasks inside the open note.
 * Everything here works on the NoteDataTree and never touches the DOM or the database.
 * @category Note DnD
 */

export type NoteDragKind = "section" | "task" | "group"
export type NoteDragRef = { kind: NoteDragKind, id: number }

/**
 * What the pointer is over:
 * - section: a section card (drop of a section = before/after it, drop of a task = last top level task)
 * - task: a task row (before / after / inside it)
 * - group: the empty area of a group (a section is appended to it; a dragged group goes before / after it)
 * - new-group: an insertion slot between groups (id = index in the list of groups) that creates a new group
 */
export type NoteOverKind = "section" | "task" | "group" | "new-group"
export type NoteOverRef = { kind: NoteOverKind, id: number }

/** Index used to mean "append at the end"; the backend clamps it. */
export const END_INDEX = 1_000_000

export type DropZone = "before" | "after" | "inside" | "inside-start"

/** Which dragged items every kind of droppable accepts. */
export const ACCEPTS: Record<NoteOverKind, NoteDragKind[]> = {
    section: ["section", "task"],
    task: ["task"],
    group: ["section", "group"],
    "new-group": ["section"],
}

export type SectionTarget =
    | { type: "group", groupId: number, index: number }
    | { type: "new-group", index: number }

export type TaskTarget = { sectionId: number, parentTaskId: number | null, index: number }

type Rect = { top: number, height: number }

/**
 * Maps the pointer position over a droppable to a drop zone.
 * - task row: top 25% = before, bottom 25% = after, middle = inside (last subtask). When the task already has
 *   subtasks its bottom 25% means "inside, first position" ("after" would land below all its subtasks).
 * - section card hovered by a section: top half = before, bottom half = after.
 * - anything else: inside.
 * @param dragKind What is being dragged.
 * @param overKind What the pointer is over.
 * @param rect Bounding rect of the hovered droppable (only top and height are used).
 * @param pointerY Vertical pointer position (same coordinate space as rect).
 * @param opts hasSubtasks: the hovered task has subtasks.
 * @category Note DnD
 */
export function computeDropZone(
    dragKind: NoteDragKind,
    overKind: NoteOverKind,
    rect: Rect,
    pointerY: number,
    opts: { hasSubtasks?: boolean } = {},
): DropZone {
    const ratio = (pointerY - rect.top) / (rect.height || 1)
    if (overKind === "task") {
        if (ratio < 0.25) return "before"
        if (ratio > 0.75) return opts.hasSubtasks ? "inside-start" : "after"
        return "inside"
    }
    if (overKind === "section" && dragKind === "section") return ratio < 0.5 ? "before" : "after"
    return "inside"
}

/**
 * Drop zone of a group dragged over another group: left half = before, right half = after.
 * @category Note DnD
 */
export function computeGroupDropZone(rect: { left: number, width: number }, pointerX: number): DropZone {
    return (pointerX - rect.left) / (rect.width || 1) < 0.5 ? "before" : "after"
}

type TaskInfo = { task: Task, sectionId: number, parentId: number | null }

/** Flat lookups over the tree (small trees, rebuilt on demand). */
export function indexTree(tree: NoteDataTree) {
    const sections = new Map<number, { section: Section, groupId: number }>()
    const tasks = new Map<number, TaskInfo>()
    const visit = (list: Task[], sectionId: number, parentId: number | null) => {
        for (const task of list) {
            tasks.set(task.id, { task, sectionId, parentId })
            visit(task.subtasks ?? [], sectionId, task.id)
        }
    }
    for (const group of tree.groups) {
        for (const section of group.sections) {
            sections.set(section.id, { section, groupId: group.id })
            visit(section.tasks ?? [], section.id, null)
        }
    }
    return { sections, tasks }
}

/** Finds a section in the tree. */
export const findSection = (tree: NoteDataTree, id: number): Section | undefined => indexTree(tree).sections.get(id)?.section

/** Finds a task (or subtask, at any depth) in the tree. */
export const findTask = (tree: NoteDataTree, id: number): Task | undefined => indexTree(tree).tasks.get(id)?.task

/** Ids of a task and of all its descendants. */
export function getTaskSubtreeIds(task: Task): Set<number> {
    const result = new Set<number>()
    const visit = (current: Task) => {
        result.add(current.id)
        current.subtasks?.forEach(visit)
    }
    visit(task)
    return result
}

/**
 * Computes the destination of a dragged section. The returned index is the final index among the sections
 * of the destination group once the section has been moved (the semantics of `moveSection`), or the index
 * among the current groups for a new group (the semantics of `moveSectionToNewGroup`).
 * Returns null when the drop is invalid or would not change anything.
 * @category Note DnD
 */
export function computeSectionTarget(
    tree: NoteDataTree,
    activeId: number,
    over: NoteOverRef,
    zone: DropZone,
): SectionTarget | null {
    const { sections } = indexTree(tree)
    const active = sections.get(activeId)
    if (!active) return null
    const sourceGroup = tree.groups.find(group => group.id === active.groupId)
    if (!sourceGroup) return null

    if (over.kind === "new-group") {
        const sourceIndex = tree.groups.findIndex(group => group.id === active.groupId)
        // Pulling out the only section of a group next to that group is just a group reorder: not offered
        if (sourceGroup.sections.length === 1 && (over.id === sourceIndex || over.id === sourceIndex + 1)) return null
        return { type: "new-group", index: over.id }
    }

    let groupId: number
    let index: number
    if (over.kind === "group") {
        const group = tree.groups.find(g => g.id === over.id)
        if (!group) return null
        groupId = group.id
        index = group.sections.filter(section => section.id !== activeId).length
    } else if (over.kind === "section") {
        if (over.id === activeId) return null
        const target = sections.get(over.id)
        if (!target) return null
        const group = tree.groups.find(g => g.id === target.groupId)
        if (!group) return null
        const without = group.sections.filter(section => section.id !== activeId)
        const overIndex = without.findIndex(section => section.id === over.id)
        if (overIndex < 0) return null
        groupId = group.id
        index = zone === "after" ? overIndex + 1 : overIndex
    } else {
        return null
    }

    if (groupId === active.groupId && sourceGroup.sections.findIndex(section => section.id === activeId) === index)
        return null
    return { type: "group", groupId, index }
}

/**
 * Computes the destination of a dragged task (or subtask). The returned index is the final index among the
 * new siblings once the task has been moved (the semantics of `moveTask`).
 * A task can never go under itself or one of its descendants.
 * Returns null when the drop is invalid or would not change anything.
 * @category Note DnD
 */
export function computeTaskTarget(
    tree: NoteDataTree,
    activeId: number,
    over: NoteOverRef,
    zone: DropZone,
): TaskTarget | null {
    const { sections, tasks } = indexTree(tree)
    const active = tasks.get(activeId)
    if (!active) return null
    const subtree = getTaskSubtreeIds(active.task)

    const siblingsOf = (sectionId: number, parentId: number | null): Task[] => {
        if (parentId == null) return sections.get(sectionId)?.section.tasks ?? []
        return tasks.get(parentId)?.task.subtasks ?? []
    }

    let sectionId: number
    let parentTaskId: number | null
    let index: number

    if (over.kind === "section") {
        if (!sections.has(over.id)) return null
        sectionId = over.id
        parentTaskId = null
        index = siblingsOf(sectionId, null).filter(task => task.id !== activeId).length
    } else if (over.kind === "task") {
        if (over.id === activeId || subtree.has(over.id)) return null
        const target = tasks.get(over.id)
        if (!target) return null
        sectionId = target.sectionId
        if (zone === "inside" || zone === "inside-start") {
            parentTaskId = target.task.id
            const without = siblingsOf(sectionId, parentTaskId).filter(task => task.id !== activeId)
            index = zone === "inside" ? without.length : 0
        } else {
            parentTaskId = target.parentId
            const without = siblingsOf(sectionId, parentTaskId).filter(task => task.id !== activeId)
            const overIndex = without.findIndex(task => task.id === over.id)
            if (overIndex < 0) return null
            index = zone === "after" ? overIndex + 1 : overIndex
        }
    } else {
        return null
    }

    if (parentTaskId != null && subtree.has(parentTaskId)) return null

    if (sectionId === active.sectionId && parentTaskId === active.parentId) {
        const currentIndex = siblingsOf(sectionId, parentTaskId).findIndex(task => task.id === activeId)
        if (currentIndex === index) return null
    }
    return { sectionId, parentTaskId, index }
}

const sortGroups = (groups: Group[]) => [...groups].sort((a, b) => a.position - b.position)

/** Finds a group in the tree and its index in the list sorted by position. */
export function findGroup(tree: NoteDataTree, id: number): { group: Group, index: number } | undefined {
    const sorted = sortGroups(tree.groups)
    const index = sorted.findIndex(group => group.id === id)
    return index < 0 ? undefined : { group: sorted[index], index }
}

/**
 * Computes the destination of a dragged group over another group: the final index among the groups (sorted by
 * position) once it has been moved. Returns null when the drop is invalid or would not change anything.
 * @category Note DnD
 */
export function computeGroupTarget(tree: NoteDataTree, activeId: number, over: NoteOverRef, zone: DropZone): { index: number } | null {
    if (over.kind !== "group" || over.id === activeId) return null
    const sorted = sortGroups(tree.groups)
    const activeIndex = sorted.findIndex(group => group.id === activeId)
    if (activeIndex < 0) return null
    const without = sorted.filter(group => group.id !== activeId)
    const overIndex = without.findIndex(group => group.id === over.id)
    if (overIndex < 0) return null
    const index = zone === "after" ? overIndex + 1 : overIndex
    return index === activeIndex ? null : { index }
}

/** Groups with the given one moved to `index`, positions renumbered from 0. Null when the group is unknown. */
export function moveGroupInList(groups: Group[], groupId: number, index: number): Group[] | null {
    const items = sortGroups(groups)
    const from = items.findIndex(group => group.id === groupId)
    if (from < 0) return null
    const [moved] = items.splice(from, 1)
    items.splice(index, 0, moved)
    return items.map((group, position) => ({ ...group, position }))
}

export type SectionMoveDestinations = {
    /** Other groups of the note, with a readable label and the titles of their sections. */
    groups: { id: number, label: string, hint: string }[]
    /** Whether "Nuovo gruppo" is offered (not for the only section of a group, that would only reorder groups). */
    canCreateGroup: boolean
    /** Index at which "Nuovo gruppo" creates the group: at the end. */
    newGroupIndex: number
}

/**
 * Destinations offered by the "Sposta in…" menu of a section: every other group (its name or "Gruppo N") plus a new group.
 * @category Note DnD
 */
export function getSectionMoveDestinations(tree: NoteDataTree, sectionId: number): SectionMoveDestinations {
    const currentGroup = tree.groups.find(group => group.sections.some(section => section.id === sectionId))
    return {
        groups: tree.groups
            .map((group, index) => ({
                id: group.id,
                label: getGroupLabel(group, index),
                hint: group.sections.map(section => section.title).join(", "),
            }))
            .filter(group => group.id !== currentGroup?.id),
        canCreateGroup: !!currentGroup && currentGroup.sections.length > 1,
        newGroupIndex: tree.groups.length,
    }
}

export type TaskMoveDestination = {
    key: string
    /** "section": as top level task of the section; "task": as a subtask of the task. */
    type: "section" | "task"
    sectionId: number
    parentTaskId: number | null
    label: string
    /** Group label (name or "Gruppo N") shown next to a section entry. */
    hint?: string
    depth: number
}

/**
 * Destinations offered by the "Sposta in…" menu of a task: every section (top level) followed by its tasks and
 * subtasks in depth-first order (as a subtask). Excludes the task itself and its descendants, the section where it
 * is already a top level task and its current parent.
 * @category Note DnD
 */
export function getTaskMoveDestinations(tree: NoteDataTree, taskId: number): TaskMoveDestination[] {
    const { tasks } = indexTree(tree)
    const active = tasks.get(taskId)
    if (!active) return []
    const subtree = getTaskSubtreeIds(active.task)
    const result: TaskMoveDestination[] = []

    const visit = (list: Task[], sectionId: number, depth: number) => {
        for (const task of list) {
            if (subtree.has(task.id)) continue
            if (task.id !== active.parentId)
                result.push({ key: `task-${task.id}`, type: "task", sectionId, parentTaskId: task.id, label: task.text, depth })
            visit(task.subtasks ?? [], sectionId, depth + 1)
        }
    }

    tree.groups.forEach((group, groupIndex) => {
        for (const section of group.sections) {
            if (!(active.parentId == null && active.sectionId === section.id))
                result.push({
                    key: `section-${section.id}`, type: "section", sectionId: section.id, parentTaskId: null,
                    label: section.title, hint: getGroupLabel(group, groupIndex), depth: 0,
                })
            visit(section.tasks ?? [], section.id, 1)
        }
    })
    return result
}
