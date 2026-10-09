import { describe, expect, it } from "vitest"
import { actionLabel, automationName, describeAutomation, triggerLabel } from "./describe"
import { ACTION_TYPES, TRIGGER_TYPES } from "./types"

const titleOf = (id: number) => id === 1 ? "Doing" : id === 2 ? "Done" : undefined
const groupLabelOf = (id: number) => id === 7 ? "Sprint 3" : undefined

describe("labels", () => {
    it("every trigger and action type has a label", () => {
        for (const type of TRIGGER_TYPES) expect(triggerLabel(type)).not.toMatch(/^automations\./)
        for (const type of ACTION_TYPES) expect(actionLabel(type)).not.toMatch(/^automations\./)
    })
})

describe("describeAutomation", () => {
    it("describes a task rule", () => {
        expect(describeAutomation({
            trigger: { type: "task.completed", sectionId: 1 },
            actions: [{ type: "moveTo", sectionId: 2, at: "bottom" }, { type: "setColor", color: "#fff" }],
        }, titleOf)).toBe("Quando un task viene completato in \"Doing\", sposta in fondo a \"Done\", colora")
    })

    it("names a section that no longer exists", () => {
        expect(describeAutomation({ trigger: { type: "task.movedInto", sectionId: 9 }, actions: [] }, titleOf)).toContain("(sezione eliminata)")
    })

    it("describes a group rule with a specific group", () => {
        expect(describeAutomation({
            trigger: { type: "group.completed", groupId: 7 },
            actions: [{ type: "setColor", color: "#fff" }, { type: "moveGroup", at: "bottom" }, { type: "archiveGroup" }],
        }, titleOf, groupLabelOf)).toBe(
            "Quando tutti i task del gruppo \"Sprint 3\" sono completati, colora il gruppo, sposta il gruppo in fondo alla nota, archivia il gruppo")
    })

    it("describes a group rule for any group", () => {
        expect(describeAutomation({
            trigger: { type: "group.completed", groupId: null },
            actions: [{ type: "setColor", color: null }, { type: "moveGroup", at: "top" }],
        }, titleOf, groupLabelOf)).toBe(
            "Quando tutti i task di un gruppo sono completati, rimuovi il colore dal gruppo, sposta il gruppo in cima alla nota")
    })

    it("shows a missing group, also without a resolver", () => {
        const rule = { trigger: { type: "group.completed", groupId: 3 } as const, actions: [{ type: "archiveGroup" } as const] }
        expect(describeAutomation(rule, titleOf, groupLabelOf)).toContain("(gruppo eliminato)")
        expect(describeAutomation(rule, titleOf)).toContain("(gruppo eliminato)")
    })
})

describe("automationName", () => {
    it("prefers the own name", () => {
        const rule = { name: "Fine sprint", trigger: { type: "group.completed", groupId: null } as const, actions: [] }
        expect(automationName(rule, titleOf)).toBe("Fine sprint")
        expect(automationName({ ...rule, name: null }, titleOf, groupLabelOf)).toBe(describeAutomation(rule, titleOf, groupLabelOf))
    })
})
