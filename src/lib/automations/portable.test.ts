import { describe, expect, it } from "vitest"
import type { NoteTemplateContent } from "@/types/template"
import { buildSectionIndex, isPortableAutomation, sectionOffsets, toPortable } from "./portable"

const section = (title: string) => ({ title, color: null, position: 0, tasks: [] })
const content: NoteTemplateContent = {
    version: 1,
    groups: [
        { name: "A", color: null, position: 0, sections: [section("s0"), section("s1")] },
        { name: null, color: null, position: 1, sections: [section("s2")] },
    ],
}

describe("buildSectionIndex", () => {
    it("maps the source ids to positions in content order", () => {
        const index = buildSectionIndex(content, [10, 11, 20])
        expect(index.get(10)).toEqual({ group: 0, section: 0 })
        expect(index.get(11)).toEqual({ group: 0, section: 1 })
        expect(index.get(20)).toEqual({ group: 1, section: 0 })
        expect(index.size).toBe(3)
    })
})

describe("sectionOffsets", () => {
    it("gives the flat position of the first section of every group", () => {
        expect(sectionOffsets(content)).toEqual([0, 2])
    })
})

describe("toPortable", () => {
    const index = buildSectionIndex(content, [10, 11, 20])

    it("replaces the section ids with positions", () => {
        expect(toPortable({
            name: "n", enabled: false,
            trigger: { type: "task.movedInto", sectionId: 11 },
            actions: [{ type: "setColor", color: "#fff" }, { type: "moveTo", sectionId: 20, at: "bottom" }],
        }, index)).toEqual({
            name: "n", enabled: false,
            trigger: { type: "task.movedInto", sectionId: { group: 0, section: 1 } },
            actions: [{ type: "setColor", color: "#fff" }, { type: "moveTo", sectionId: { group: 1, section: 0 }, at: "bottom" }],
        })
    })

    it("keeps a null trigger section", () => {
        expect(toPortable({ name: null, enabled: true, trigger: { type: "task.created", sectionId: null }, actions: [] }, index))
            .toEqual({ name: null, enabled: true, trigger: { type: "task.created", sectionId: null }, actions: [] })
    })

    it("returns null when a referenced section is not in the content", () => {
        expect(toPortable({ name: null, enabled: true, trigger: { type: "task.completed", sectionId: 99 }, actions: [] }, index)).toBeNull()
        expect(toPortable({
            name: null, enabled: true, trigger: { type: "task.completed", sectionId: null },
            actions: [{ type: "moveTo", sectionId: 99, at: "top" }],
        }, index)).toBeNull()
    })
})

describe("isPortableAutomation", () => {
    const ok = {
        name: null, enabled: true,
        trigger: { type: "task.completed", sectionId: { group: 1, section: 0 } },
        actions: [{ type: "moveTo", sectionId: { group: 0, section: 1 }, at: "top" }, { type: "completeSubtasks" }],
    }

    it("accepts a valid rule", () => {
        expect(isPortableAutomation(ok, content)).toBe(true)
        expect(isPortableAutomation({ ...ok, trigger: { type: "task.created", sectionId: null }, actions: [] }, content)).toBe(true)
    })

    it("rejects invalid structures and out of bounds positions", () => {
        const invalid: unknown[] = [
            null, 3, {}, { ...ok, enabled: 1 }, { ...ok, name: undefined }, { ...ok, actions: {} },
            { ...ok, trigger: { type: "task.movedInto", sectionId: null } },
            { ...ok, trigger: { type: "bogus", sectionId: null } },
            { ...ok, trigger: { type: "task.completed", sectionId: { group: 2, section: 0 } } },
            { ...ok, trigger: { type: "task.completed", sectionId: { group: 0, section: 2 } } },
            { ...ok, trigger: { type: "task.completed", sectionId: { group: -1, section: 0 } } },
            { ...ok, trigger: { type: "task.completed", sectionId: { group: 0.5, section: 0 } } },
            { ...ok, trigger: { type: "task.completed", sectionId: 3 } },
            { ...ok, actions: [{ type: "moveTo", sectionId: 3, at: "top" }] },
            { ...ok, actions: [{ type: "moveTo", sectionId: { group: 0, section: 5 }, at: "top" }] },
            { ...ok, actions: [{ type: "moveTo", sectionId: { group: 0, section: 0 }, at: "middle" }] },
            { ...ok, actions: [{ type: "setCompleted", value: "x" }] },
        ]
        for (const value of invalid) expect(isPortableAutomation(value, content)).toBe(false)
    })
})
