import type { NoteDataTree, Task } from "@/types/types"
import { findSection, findTask, mapTask, moveTask, patchTask } from "@/contexts/note-tree-ops"
import { referencedSections, type Automation, type AutomationAction, type AutomationEvent, type AutomationTrigger } from "./types"

/**
 * Most events handled for one user action: the actions of a rule raise new events (a move, a completion…) and the
 * rules can feed each other, so the chain is bounded (besides, a rule runs at most once per task in a chain).
 * @category Automations
 */
export const MAX_AUTOMATION_STEPS = 50

/** The events seen by the rules: the user events plus "the subtasks of this task are now all completed". */
type EngineEvent = AutomationEvent | { type: "subtasks.completed", taskId: number }

/**
 * Outcome of the rules for one event: the note after every action, the rules that changed something (in order) and
 * the tasks the actions changed (not the tasks that only shifted because another one moved).
 * `tree` is the very tree given in input when nothing changed.
 * @category Automations
 */
export type AutomationOutcome = { tree: NoteDataTree, applied: Automation[], touched: number[] }

/** Whether every task under `task` (at any depth) is completed; false without subtasks. */
export function allSubtasksCompleted(task: Task): boolean {
    const visit = (tasks: Task[]): boolean => tasks.every(sub => !!sub.completed && visit(sub.subtasks))
    return task.subtasks.length > 0 && visit(task.subtasks)
}

function matches(trigger: AutomationTrigger, event: EngineEvent, tree: NoteDataTree): boolean {
    const found = findTask(tree, event.taskId)
    if (!found) return false
    const topLevel = "sectionId" in found.parent
    const section = found.task.sectionID
    const inSection = trigger.sectionId === null || trigger.sectionId === section
    switch (trigger.type) {
        case "task.completed": return event.type === "task.completed" && topLevel && inSection && !!found.task.completed
        case "task.reopened": return event.type === "task.reopened" && topLevel && inSection && !found.task.completed
        case "task.created": return event.type === "task.created" && topLevel && inSection
        case "task.movedInto": return event.type === "task.moved" && topLevel && section === trigger.sectionId && event.fromSectionId !== section
        case "subtasks.completed": return event.type === "subtasks.completed" && inSection && allSubtasksCompleted(found.task)
    }
}

/** The events implied by another one: completing the last open subtask completes the subtasks of the parent. */
function derivedEvents(tree: NoteDataTree, event: EngineEvent): EngineEvent[] {
    if (event.type !== "task.completed") return []
    const found = findTask(tree, event.taskId)
    if (!found || !("parentTaskId" in found.parent)) return []
    const parent = findTask(tree, found.parent.parentTaskId)
    return parent && allSubtasksCompleted(parent.task) ? [{ type: "subtasks.completed", taskId: parent.task.id }] : []
}

const descendantIds = (task: Task): number[] => task.subtasks.flatMap(sub => [sub.id, ...descendantIds(sub)])

const completeAll = (task: Task): Task => ({
    ...task,
    subtasks: task.subtasks.map(sub => ({ ...completeAll(sub), completed: true })),
})

/** Applies one action to a task: the new tree (the same one when nothing changed) and the events it raises. */
function applyAction(tree: NoteDataTree, taskId: number, action: AutomationAction): { tree: NoteDataTree, events: EngineEvent[] } {
    const found = findTask(tree, taskId)
    const none = { tree, events: [] }
    if (!found) return none
    const task = found.task

    switch (action.type) {
        case "moveTo": {
            // Only the top level tasks move: a subtask stays under its parent
            if (!("sectionId" in found.parent)) return none
            const target = findSection(tree, action.sectionId)
            if (!target) return none
            const from = found.parent.sectionId
            const others = target.section.tasks.filter(other => other.id !== taskId).length
            const index = action.at === "top" ? 0 : others
            if (from === action.sectionId && found.index === index) return none
            const next = moveTask(tree, taskId, { sectionId: action.sectionId, parentTaskId: null }, index)
            if (next === tree) return none
            return { tree: next, events: from !== action.sectionId ? [{ type: "task.moved", taskId, fromSectionId: from }] : [] }
        }
        case "setCompleted":
            if (!!task.completed === action.value) return none
            return {
                tree: patchTask(tree, taskId, { completed: action.value }),
                events: [{ type: action.value ? "task.completed" : "task.reopened", taskId }],
            }
        case "setPriority":
            if (!!task.priority === action.value) return none
            return { tree: patchTask(tree, taskId, { priority: action.value }), events: [] }
        case "setColor":
            if ((task.color ?? null) === action.color) return none
            return { tree: patchTask(tree, taskId, { color: action.color }), events: [] }
        case "completeSubtasks":
            if (task.subtasks.length === 0 || allSubtasksCompleted(task)) return none
            return { tree: mapTask(tree, taskId, completeAll), events: [{ type: "subtasks.completed", taskId }] }
    }
}

/**
 * Runs the rules of a note on an event, on the note as it is after the user action.
 * Pure: it computes the resulting note, the caller persists it (see diffTaskStatements).
 * - the enabled rules run in their order; a rule whose sections are no longer in the note is skipped;
 * - the events raised by the actions are handled in turn (at most MAX_AUTOMATION_STEPS events);
 * - a rule runs at most once per task in a chain, so two rules cannot bounce a task forever.
 * @param tree The note after the user action.
 * @param rules The rules of the note.
 * @param event What the user did.
 * @category Automations
 */
export function runAutomations(tree: NoteDataTree, rules: readonly Automation[], event: AutomationEvent): AutomationOutcome {
    const active = rules
        .filter(rule => rule.enabled && referencedSections(rule).every(id => !!findSection(tree, id)))
        .sort((a, b) => a.position - b.position || a.id - b.id)
    if (active.length === 0) return { tree, applied: [], touched: [] }

    const queue: EngineEvent[] = [event]
    const fired = new Set<string>()
    const applied = new Map<number, Automation>()
    const touched = new Set<number>()
    let current = tree

    for (let steps = 0; queue.length > 0 && steps < MAX_AUTOMATION_STEPS; steps++) {
        const next = queue.shift() as EngineEvent
        queue.push(...derivedEvents(current, next))
        for (const rule of active) {
            if (!matches(rule.trigger, next, current)) continue
            const key = `${rule.id}:${next.taskId}`
            if (fired.has(key)) continue
            fired.add(key)
            for (const action of rule.actions) {
                const result = applyAction(current, next.taskId, action)
                if (result.tree !== current) {
                    applied.set(rule.id, rule)
                    touched.add(next.taskId)
                    if (action.type === "completeSubtasks") {
                        const found = findTask(current, next.taskId)
                        if (found) descendantIds(found.task).forEach(id => touched.add(id))
                    }
                }
                current = result.tree
                queue.push(...result.events)
            }
        }
    }
    return { tree: current, applied: [...applied.values()], touched: [...touched] }
}
