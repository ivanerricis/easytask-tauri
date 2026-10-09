import i18n from "@/i18n"
import { triggerSubject, type Automation, type AutomationAction, type AutomationActionType, type AutomationSubject, type AutomationTrigger, type AutomationTriggerType } from "./types"

/** The i18n key of every trigger type (the keys cannot contain the dot of the type). */
export const TRIGGER_KEYS = {
    "task.completed": "taskCompleted",
    "task.reopened": "taskReopened",
    "task.created": "taskCreated",
    "task.movedInto": "taskMovedInto",
    "subtasks.completed": "subtasksCompleted",
    "group.completed": "groupCompleted",
} as const satisfies Record<AutomationTriggerType, string>

export const triggerLabel = (type: AutomationTriggerType) => i18n.t(`automations.triggers.${TRIGGER_KEYS[type]}`)
export const actionLabel = (type: AutomationActionType) => i18n.t(`automations.actions.${type}`)

/** Title of a section of the note, undefined when it no longer exists. */
export type SectionTitleOf = (sectionId: number) => string | undefined

/** Label of a group of the note (its name or "Group N"), undefined when it no longer exists. */
export type GroupLabelOf = (groupId: number) => string | undefined

const groupName = (labelOf: GroupLabelOf | undefined, id: number) => labelOf?.(id) ?? i18n.t("automations.describe.missingGroup")

const sectionName = (titleOf: SectionTitleOf, id: number) => titleOf(id) ?? i18n.t("automations.describe.missingSection")

function describeTrigger(trigger: AutomationTrigger, titleOf: SectionTitleOf, groupLabelOf?: GroupLabelOf): string {
    if (trigger.type === "group.completed")
        return trigger.groupId === null ? triggerLabel(trigger.type) : i18n.t("automations.describe.groupCompleted", { group: groupName(groupLabelOf, trigger.groupId) })
    const text = triggerLabel(trigger.type)
    // "arrives in the section" already names the section in its label
    if (trigger.type === "task.movedInto") return `${text} "${sectionName(titleOf, trigger.sectionId)}"`
    return trigger.sectionId === null ? text : i18n.t("automations.describe.inSection", { trigger: text, section: sectionName(titleOf, trigger.sectionId) })
}

function describeAction(action: AutomationAction, titleOf: SectionTitleOf, subject: AutomationSubject): string {
    switch (action.type) {
        case "moveTo": return i18n.t(action.at === "top" ? "automations.describe.moveTop" : "automations.describe.moveBottom", { section: sectionName(titleOf, action.sectionId) })
        case "setCompleted": return i18n.t(action.value ? "automations.describe.complete" : "automations.describe.reopen")
        case "setPriority": return i18n.t(action.value ? "automations.describe.addPriority" : "automations.describe.removePriority")
        case "setColor": {
            const suffix = subject === "group" ? "Group" : ""
            return i18n.t(`automations.describe.${action.color ? "setColor" : "removeColor"}${suffix}`)
        }
        case "completeSubtasks": return i18n.t("automations.describe.completeSubtasks")
        case "moveGroup": return i18n.t(action.at === "top" ? "automations.describe.moveGroupTop" : "automations.describe.moveGroupBottom")
        case "archiveGroup": return i18n.t("automations.describe.archiveGroup")
    }
}

/**
 * The rule as a sentence ("When a task is completed in "Doing", move to the bottom of "Done"").
 * @param groupLabelOf Resolves the group of a group rule; without it the group is shown as deleted.
 * @category Automations
 */
export function describeAutomation(rule: Pick<Automation, "trigger" | "actions">, titleOf: SectionTitleOf, groupLabelOf?: GroupLabelOf): string {
    return i18n.t("automations.describe.rule", {
        trigger: describeTrigger(rule.trigger, titleOf, groupLabelOf),
        actions: rule.actions.map(action => describeAction(action, titleOf, triggerSubject(rule.trigger.type))).join(", "),
    })
}

/**
 * The name shown for a rule: its own name, or its description.
 * @category Automations
 */
export const automationName = (rule: Pick<Automation, "name" | "trigger" | "actions">, titleOf: SectionTitleOf, groupLabelOf?: GroupLabelOf) =>
    rule.name ?? describeAutomation(rule, titleOf, groupLabelOf)
