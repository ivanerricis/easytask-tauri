import i18n from "@/i18n"
import type { Automation, AutomationAction, AutomationActionType, AutomationTrigger, AutomationTriggerType } from "./types"

/** The i18n key of every trigger type (the keys cannot contain the dot of the type). */
export const TRIGGER_KEYS = {
    "task.completed": "taskCompleted",
    "task.reopened": "taskReopened",
    "task.created": "taskCreated",
    "task.movedInto": "taskMovedInto",
    "subtasks.completed": "subtasksCompleted",
} as const satisfies Record<AutomationTriggerType, string>

export const triggerLabel = (type: AutomationTriggerType) => i18n.t(`automations.triggers.${TRIGGER_KEYS[type]}`)
export const actionLabel = (type: AutomationActionType) => i18n.t(`automations.actions.${type}`)

/** Title of a section of the note, undefined when it no longer exists. */
export type SectionTitleOf = (sectionId: number) => string | undefined

const sectionName = (titleOf: SectionTitleOf, id: number) => titleOf(id) ?? i18n.t("automations.describe.missingSection")

function describeTrigger(trigger: AutomationTrigger, titleOf: SectionTitleOf): string {
    const text = triggerLabel(trigger.type)
    // "arrives in the section" already names the section in its label
    if (trigger.type === "task.movedInto") return `${text} "${sectionName(titleOf, trigger.sectionId)}"`
    return trigger.sectionId === null ? text : i18n.t("automations.describe.inSection", { trigger: text, section: sectionName(titleOf, trigger.sectionId) })
}

function describeAction(action: AutomationAction, titleOf: SectionTitleOf): string {
    switch (action.type) {
        case "moveTo": return i18n.t(action.at === "top" ? "automations.describe.moveTop" : "automations.describe.moveBottom", { section: sectionName(titleOf, action.sectionId) })
        case "setCompleted": return i18n.t(action.value ? "automations.describe.complete" : "automations.describe.reopen")
        case "setPriority": return i18n.t(action.value ? "automations.describe.addPriority" : "automations.describe.removePriority")
        case "setColor": return i18n.t(action.color ? "automations.describe.setColor" : "automations.describe.removeColor")
        case "completeSubtasks": return i18n.t("automations.describe.completeSubtasks")
    }
}

/**
 * The rule as a sentence ("When a task is completed in "Doing", move to the bottom of "Done"").
 * @category Automations
 */
export function describeAutomation(rule: Pick<Automation, "trigger" | "actions">, titleOf: SectionTitleOf): string {
    return i18n.t("automations.describe.rule", {
        trigger: describeTrigger(rule.trigger, titleOf),
        actions: rule.actions.map(action => describeAction(action, titleOf)).join(", "),
    })
}

/**
 * The name shown for a rule: its own name, or its description.
 * @category Automations
 */
export const automationName = (rule: Pick<Automation, "name" | "trigger" | "actions">, titleOf: SectionTitleOf) =>
    rule.name ?? describeAutomation(rule, titleOf)
