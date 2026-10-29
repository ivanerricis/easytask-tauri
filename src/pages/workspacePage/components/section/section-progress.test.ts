import { describe, expect, it } from "vitest"
import { getSectionCompletionPercent } from "./section-progress"
import { getGroupProgress } from "../groups/group-progress"
import { makeGroup, makeSection, makeTask } from "@/test/ui-fixtures"

const withSubs = (completed: boolean, subs: boolean[]) =>
    makeTask({ completed, subtasks: subs.map((c, i) => makeTask({ id: 100 + i, completed: c })) })

describe("getSectionCompletionPercent", () => {
    it("is 100 for an empty section", () => {
        expect(getSectionCompletionPercent([])).toBe(100)
    })

    it("counts top-level tasks only", () => {
        expect(getSectionCompletionPercent([makeTask({ completed: true }), makeTask({ id: 2 }), makeTask({ id: 3 }), makeTask({ id: 4 })])).toBe(25)
    })

    it("counts a task as done when all its subtasks are done, even if it is not completed itself", () => {
        expect(getSectionCompletionPercent([withSubs(false, [true, true]), withSubs(false, [true, false])])).toBe(50)
    })

    it("agrees with the group progress for tasks without subtasks (except the empty case)", () => {
        const tasks = [makeTask({ completed: true }), makeTask({ id: 2 }), makeTask({ id: 3, completed: true })]
        const group = makeGroup({ sections: [makeSection({ tasks })] })
        expect(getSectionCompletionPercent(tasks)).toBeCloseTo(getGroupProgress(group).percent)
    })

    it("differs from the group progress when subtasks are present (documented difference)", () => {
        const tasks = [withSubs(false, [true, false])]
        expect(getSectionCompletionPercent(tasks)).toBe(0)
        expect(getGroupProgress(makeGroup({ sections: [makeSection({ tasks })] })).percent).toBeCloseTo(100 / 3)
    })
})
