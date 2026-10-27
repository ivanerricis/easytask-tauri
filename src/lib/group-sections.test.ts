import { describe, expect, it } from "vitest"
import type { Section } from "@/types/types"
import { isDefaultSection, taskSections } from "./group-sections"

const section = (id: number, extra: Partial<Section> = {}): Section => ({
    id, groupID: 1, title: `S${id}`, position: id, creation_date: "", creation_time: "", edit_date: "", edit_time: "", tasks: [], ...extra,
})

describe("isDefaultSection", () => {
    it("accepts the boolean and the 0/1 coming from SQLite", () => {
        expect(isDefaultSection(section(1, { is_default: true }))).toBe(true)
        expect(isDefaultSection(section(1, { is_default: 1 }))).toBe(true)
    })

    it("is false for a normal section, a missing flag or no section", () => {
        expect(isDefaultSection(section(1))).toBe(false)
        expect(isDefaultSection(section(1, { is_default: false }))).toBe(false)
        expect(isDefaultSection(section(1, { is_default: 0 }))).toBe(false)
        expect(isDefaultSection(null)).toBe(false)
        expect(isDefaultSection(undefined)).toBe(false)
    })
})

describe("taskSections", () => {
    it("puts the default section before the normal ones", () => {
        const def = section(1, { is_default: 1 })
        const a = section(2)
        const b = section(3)
        expect(taskSections({ defaultSection: def, sections: [a, b] })).toEqual([def, a, b])
    })

    it("skips a missing default section", () => {
        const a = section(2)
        expect(taskSections({ defaultSection: null, sections: [a] })).toEqual([a])
        expect(taskSections({ sections: [a] })).toEqual([a])
        expect(taskSections({ sections: [] })).toEqual([])
    })
})
