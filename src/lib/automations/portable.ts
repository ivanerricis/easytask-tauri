import type { NoteTemplateContent } from "@/types/template"
import {
    isAutomationAction, TRIGGER_TYPES,
    type Automation, type AutomationAction, type AutomationTriggerType,
} from "./types"

/**
 * A section of a note content by position: `content.groups[group].sections[section]`. Ids change when a note is copied or
 * imported, positions in the content do not.
 * @category Automations
 */
export type PortableSectionRef = { group: number, section: number }

/** A trigger of a portable rule: the section is a position in the content (null = any section). */
export type PortableTrigger = { type: AutomationTriggerType, sectionId: PortableSectionRef | null }

/** An action of a portable rule: a move targets a position in the content. */
export type PortableAction =
    | Exclude<AutomationAction, { type: "moveTo" }>
    | { type: "moveTo", sectionId: PortableSectionRef, at: "top" | "bottom" }

/**
 * A rule independent of the ids of its note, to be copied or exported together with the note content
 * (see `buildContent` in src/db/queries/template.ts for the order of the sections).
 * @category Automations
 */
export type PortableAutomation = {
    name: string | null
    enabled: boolean
    trigger: PortableTrigger
    actions: PortableAction[]
}

/**
 * Maps the id of every section of a note to its position in `content`.
 * @param content The note content.
 * @param sectionIds The ids of the source sections, in content order (groups first, then the sections of each group).
 * @category Automations
 */
export function buildSectionIndex(content: NoteTemplateContent, sectionIds: readonly number[]): Map<number, PortableSectionRef> {
    const index = new Map<number, PortableSectionRef>()
    let flat = 0
    content.groups.forEach((group, g) => group.sections.forEach((_, s) => {
        const id = sectionIds[flat++]
        if (id !== undefined) index.set(id, { group: g, section: s })
    }))
    return index
}

/**
 * The position of every section of a content in the flat list of its sections (content order), as `offsets[group] + section`.
 * @category Automations
 */
export function sectionOffsets(content: NoteTemplateContent): number[] {
    let total = 0
    return content.groups.map(group => {
        const start = total
        total += group.sections.length
        return start
    })
}

/**
 * The portable version of a rule, or null when it refers to a section that is not in the index
 * (e.g. an archived section left out of a duplicated content): such a rule cannot be carried over.
 * @param rule The rule of the source note.
 * @param sectionIndex See buildSectionIndex.
 * @category Automations
 */
export function toPortable(rule: Pick<Automation, "name" | "enabled" | "trigger" | "actions">, sectionIndex: ReadonlyMap<number, PortableSectionRef>): PortableAutomation | null {
    let trigger: PortableTrigger
    if (rule.trigger.sectionId === null) {
        trigger = { type: rule.trigger.type, sectionId: null }
    } else {
        const ref = sectionIndex.get(rule.trigger.sectionId)
        if (!ref) return null
        trigger = { type: rule.trigger.type, sectionId: { ...ref } }
    }

    const actions: PortableAction[] = []
    for (const action of rule.actions) {
        if (action.type !== "moveTo") {
            actions.push(action)
            continue
        }
        const ref = sectionIndex.get(action.sectionId)
        if (!ref) return null
        actions.push({ type: "moveTo", sectionId: { ...ref }, at: action.at })
    }
    return { name: rule.name, enabled: rule.enabled, trigger, actions }
}

const isIndex = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value >= 0

function isSectionInContent(value: unknown, content: NoteTemplateContent): value is PortableSectionRef {
    if (typeof value !== "object" || value === null) return false
    const { group, section } = value as { group?: unknown, section?: unknown }
    return isIndex(group) && isIndex(section) && group < content.groups.length && section < content.groups[group].sections.length
}

/**
 * Whether a parsed JSON value is a valid portable rule for `content` (every section reference must point to an existing
 * section of the content). The file content is never trusted blindly.
 * @category Automations
 */
export function isPortableAutomation(value: unknown, content: NoteTemplateContent): value is PortableAutomation {
    if (typeof value !== "object" || value === null) return false
    const { name, enabled, trigger, actions } = value as Record<string, unknown>
    if (!(name === null || typeof name === "string") || typeof enabled !== "boolean") return false

    if (typeof trigger !== "object" || trigger === null) return false
    const { type, sectionId } = trigger as { type?: unknown, sectionId?: unknown }
    if (!TRIGGER_TYPES.includes(type as AutomationTriggerType)) return false
    if (sectionId === null ? type === "task.movedInto" : !isSectionInContent(sectionId, content)) return false

    if (!Array.isArray(actions)) return false
    return actions.every(action => {
        if (typeof action === "object" && action !== null && (action as { type?: unknown }).type === "moveTo") {
            const { sectionId: target, at } = action as { sectionId?: unknown, at?: unknown }
            return isSectionInContent(target, content) && (at === "top" || at === "bottom")
        }
        return isAutomationAction(action)
    })
}
