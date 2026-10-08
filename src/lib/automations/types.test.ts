import { describe, expect, it } from "vitest"
import { isAutomationAction, isAutomationTrigger, referencedSections, TRIGGER_TYPES } from "./types"

describe("isAutomationTrigger", () => {
    it("accepts every trigger type with a section or null", () => {
        for (const type of TRIGGER_TYPES.filter(t => t !== "task.movedInto")) {
            expect(isAutomationTrigger({ type, sectionId: null })).toBe(true)
            expect(isAutomationTrigger({ type, sectionId: 3 })).toBe(true)
        }
    })

    it("movedInto needs a section", () => {
        expect(isAutomationTrigger({ type: "task.movedInto", sectionId: 2 })).toBe(true)
        expect(isAutomationTrigger({ type: "task.movedInto", sectionId: null })).toBe(false)
    })

    it("rejects anything else", () => {
        for (const value of [null, undefined, 3, "x", [], {}, { type: "nope", sectionId: null },
            { type: "task.completed" }, { type: "task.completed", sectionId: "1" }, { type: "task.completed", sectionId: 1.5 }])
            expect(isAutomationTrigger(value)).toBe(false)
    })
})

describe("isAutomationAction", () => {
    it("accepts valid actions", () => {
        for (const action of [
            { type: "moveTo", sectionId: 1, at: "top" }, { type: "moveTo", sectionId: 1, at: "bottom" },
            { type: "setCompleted", value: false }, { type: "setPriority", value: true },
            { type: "setColor", color: null }, { type: "setColor", color: "#fff" }, { type: "completeSubtasks" },
        ]) expect(isAutomationAction(action)).toBe(true)
    })

    it("rejects invalid ones", () => {
        for (const value of [null, 1, "x", {}, { type: "boom" },
            { type: "moveTo", sectionId: null, at: "top" }, { type: "moveTo", sectionId: 1, at: "middle" }, { type: "moveTo", sectionId: 1 },
            { type: "setCompleted", value: "yes" }, { type: "setPriority" },
            { type: "setColor", color: "" }, { type: "setColor", color: 3 }, { type: "setColor" }])
            expect(isAutomationAction(value)).toBe(false)
    })
})

describe("referencedSections", () => {
    it("collects the trigger section and the move targets without duplicates", () => {
        expect(referencedSections({
            trigger: { type: "task.completed", sectionId: 1 },
            actions: [{ type: "moveTo", sectionId: 2, at: "top" }, { type: "moveTo", sectionId: 1, at: "bottom" }, { type: "setPriority", value: true }],
        }).sort()).toEqual([1, 2])
    })

    it("ignores a null trigger section and non-move actions", () => {
        expect(referencedSections({ trigger: { type: "task.created", sectionId: null }, actions: [{ type: "completeSubtasks" }] })).toEqual([])
    })
})
