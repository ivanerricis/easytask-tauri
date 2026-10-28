import { describe, expect, it } from "vitest"
import type { Group, Section, Task } from "@/types/types"
import { groupHasContent, sectionHasContent } from "./delete-content"

const task = { id: 1 } as Task
const section = (title: string, tasks: Task[] = []) => ({ id: 1, title, tasks }) as Section
const group = (sections: Section[], defaultSection: Section | null = null) => ({ sections, defaultSection }) as Group

describe("sectionHasContent", () => {
    it("needs at least one task", () => {
        expect(sectionHasContent(section("Named"))).toBe(false)
        expect(sectionHasContent(section("", [task]))).toBe(true)
    })
})

describe("groupHasContent", () => {
    it("is false for an empty group", () => {
        expect(groupHasContent(group([]), 0)).toBe(false)
        expect(groupHasContent(group([section("  ")], section("")), 0)).toBe(false)
    })

    it.each([
        ["a named section", group([section("Todo")]), 0],
        ["a task in a section", group([section("", [task])]), 0],
        ["a direct task", group([], section("", [task])), 0],
        ["an audio file", group([]), 1],
    ])("is true with %s", (_name, g, audio) => {
        expect(groupHasContent(g, audio)).toBe(true)
    })
})
