import { describe, expect, it } from "vitest"
import { makeDefaultSection, makeGroup, makeSection, makeTask } from "@/test/ui-fixtures"
import type { NoteDataTree } from "@/types/types"
import { collapsedIds, isCollapsed } from "./collapsed"

describe("isCollapsed", () => {
    it("normalizes true/false and 0/1, absent and null are open", () => {
        expect([true, 1].map(collapsed => isCollapsed({ collapsed }))).toEqual([true, true])
        expect([false, 0, undefined, null].map(collapsed => isCollapsed({ collapsed }))).toEqual([false, false, false, false])
        expect(isCollapsed({})).toBe(false)
        expect(isCollapsed(null)).toBe(false)
        expect(isCollapsed(undefined)).toBe(false)
    })
})

describe("collapsedIds", () => {
    const tree = (): NoteDataTree => ({
        groups: [
            makeGroup({ id: 1, collapsed: 1, sections: [makeSection({ id: 10, collapsed: true, tasks: [makeTask({ id: 1, collapsed: 1, subtasks: [makeTask({ id: 2, collapsed: true, subtasks: [makeTask({ id: 3 })] })] })] }), makeSection({ id: 11 })] }),
            makeGroup({
                id: 2, collapsed: 0,
                defaultSection: makeDefaultSection({ id: 20, collapsed: 1, tasks: [makeTask({ id: 4, collapsed: 1 }), makeTask({ id: 5, collapsed: 0 })] }),
                sections: [],
            }),
        ],
    })

    it("lists the closed groups, sections and tasks at any depth, the direct tasks list included", () => {
        const ids = collapsedIds(tree())
        expect([...ids.groups]).toEqual([1])
        expect([...ids.sections]).toEqual([10, 20])
        expect([...ids.tasks]).toEqual([1, 2, 4])
    })

    it("is computed once per tree object", () => {
        const one = tree()
        expect(collapsedIds(one)).toBe(collapsedIds(one))
        expect(collapsedIds(tree())).not.toBe(collapsedIds(one))
    })

    it("an empty note has nothing closed", () => {
        const ids = collapsedIds({ groups: [] })
        expect([ids.groups.size, ids.sections.size, ids.tasks.size]).toEqual([0, 0, 0])
    })
})
