import { describe, expect, it } from "vitest"
import type { Section } from "@/types/types"
import { defaultIndexAfterInsert, directIndexOf, isDefaultSection, orderedItems, taskSections } from "./group-sections"

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

describe("directIndexOf", () => {
    it("is 0 when absent and is clamped to 0..sections.length", () => {
        const sections = [section(2), section(3)]
        expect(directIndexOf({ sections })).toBe(0)
        expect(directIndexOf({ defaultIndex: 1, sections })).toBe(1)
        expect(directIndexOf({ defaultIndex: 9, sections })).toBe(2)
        expect(directIndexOf({ defaultIndex: -3, sections })).toBe(0)
        expect(directIndexOf({ defaultIndex: Number.NaN, sections })).toBe(0)
    })
})

describe("orderedItems / taskSections with a list that is not on top", () => {
    const def = section(1, { is_default: 1 })
    const [a, b, c] = [section(2), section(3), section(4)]

    it("inserts the default section at defaultIndex", () => {
        expect(orderedItems({ defaultSection: def, defaultIndex: 0, sections: [a, b, c] })).toEqual([def, a, b, c])
        expect(orderedItems({ defaultSection: def, defaultIndex: 1, sections: [a, b, c] })).toEqual([a, def, b, c])
        expect(orderedItems({ defaultSection: def, defaultIndex: 3, sections: [a, b, c] })).toEqual([a, b, c, def])
        expect(taskSections({ defaultSection: def, defaultIndex: 2, sections: [a, b, c] })).toEqual([a, b, def, c])
    })

    it("treats a missing defaultIndex as 0 and does not change the sections array", () => {
        const sections = [a, b]
        expect(orderedItems({ defaultSection: def, sections })).toEqual([def, a, b])
        expect(sections).toEqual([a, b])
        expect(orderedItems({ defaultSection: null, defaultIndex: 1, sections })).toEqual([a, b])
    })
})

describe("defaultIndexAfterInsert", () => {
    it("moves the list down only when the section goes before it", () => {
        expect(defaultIndexAfterInsert(2, 0)).toBe(3)
        expect(defaultIndexAfterInsert(2, 1)).toBe(3)
        // exactly where the list is: the new section goes after it (like the database)
        expect(defaultIndexAfterInsert(2, 2)).toBe(2)
        expect(defaultIndexAfterInsert(2, 9)).toBe(2)
        expect(defaultIndexAfterInsert(0, 0)).toBe(0)
        expect(defaultIndexAfterInsert(2, -4)).toBe(3)
    })
})