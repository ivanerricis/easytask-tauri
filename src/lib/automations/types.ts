/**
 * The automations of a note: "when <trigger>, then <actions>". A rule only sees and changes its own note.
 * The `task.*` triggers concern the top level tasks of a section; `subtasks.completed` concerns a task whose subtasks
 * have just all been completed (at any depth).
 * @category Automations
 */
export type AutomationTrigger =
    /** A task is completed (sectionId null = in any section of the note). */
    | { type: "task.completed", sectionId: number | null }
    /** A completed task is opened again. */
    | { type: "task.reopened", sectionId: number | null }
    /** A task is created. */
    | { type: "task.created", sectionId: number | null }
    /** A task arrives in a section from another one. */
    | { type: "task.movedInto", sectionId: number }
    /** The last open subtask of a task is completed (the actions apply to that task). */
    | { type: "subtasks.completed", sectionId: number | null }

/**
 * What a rule does to the task of its trigger.
 * @category Automations
 */
export type AutomationAction =
    /** Moves the task (top level only) to a section of the note, first or last. */
    | { type: "moveTo", sectionId: number, at: "top" | "bottom" }
    | { type: "setCompleted", value: boolean }
    | { type: "setPriority", value: boolean }
    /** null removes the color. */
    | { type: "setColor", color: string | null }
    /** Completes every subtask (at any depth). */
    | { type: "completeSubtasks" }

export type AutomationTriggerType = AutomationTrigger["type"]
export type AutomationActionType = AutomationAction["type"]

/**
 * A rule of a note.
 * @category Automations
 */
export type Automation = {
    id: number
    noteId: number
    /** Optional name shown in the list and in the toasts (null = described from the rule). */
    name: string | null
    enabled: boolean
    trigger: AutomationTrigger
    actions: AutomationAction[]
    position: number
}

/** A rule as it is created or edited (the id, note and position belong to the database). */
export type AutomationDraft = Pick<Automation, "name" | "enabled" | "trigger" | "actions">

/**
 * Something the user did to a task of the open note, after it has been applied.
 * @category Automations
 */
export type AutomationEvent =
    | { type: "task.completed", taskId: number }
    | { type: "task.reopened", taskId: number }
    | { type: "task.created", taskId: number }
    /** `fromSectionId` is the section the task was in before the move. */
    | { type: "task.moved", taskId: number, fromSectionId: number }

export const TRIGGER_TYPES: readonly AutomationTriggerType[] = ["task.completed", "task.reopened", "task.created", "task.movedInto", "subtasks.completed"]
export const ACTION_TYPES: readonly AutomationActionType[] = ["moveTo", "setCompleted", "setPriority", "setColor", "completeSubtasks"]

const isSectionRef = (value: unknown, allowNull: boolean) =>
    (allowNull && value === null) || (typeof value === "number" && Number.isInteger(value))

/**
 * Whether a parsed JSON value is a valid trigger (the database content is never trusted blindly).
 * @category Automations
 */
export function isAutomationTrigger(value: unknown): value is AutomationTrigger {
    if (typeof value !== "object" || value === null) return false
    const { type, sectionId } = value as { type?: unknown, sectionId?: unknown }
    if (type === "task.movedInto") return isSectionRef(sectionId, false)
    return TRIGGER_TYPES.includes(type as AutomationTriggerType) && isSectionRef(sectionId, true)
}

/**
 * Whether a parsed JSON value is a valid action.
 * @category Automations
 */
export function isAutomationAction(value: unknown): value is AutomationAction {
    if (typeof value !== "object" || value === null) return false
    const action = value as Record<string, unknown>
    switch (action.type) {
        case "moveTo": return isSectionRef(action.sectionId, false) && (action.at === "top" || action.at === "bottom")
        case "setCompleted":
        case "setPriority": return typeof action.value === "boolean"
        case "setColor": return action.color === null || (typeof action.color === "string" && action.color.length > 0)
        case "completeSubtasks": return true
        default: return false
    }
}

/**
 * The sections a rule refers to (its trigger and its moves): a rule whose section is no longer in the note is skipped.
 * @category Automations
 */
export function referencedSections(rule: Pick<Automation, "trigger" | "actions">): number[] {
    const ids = new Set<number>()
    if (rule.trigger.sectionId !== null) ids.add(rule.trigger.sectionId)
    for (const action of rule.actions) if (action.type === "moveTo") ids.add(action.sectionId)
    return [...ids]
}
