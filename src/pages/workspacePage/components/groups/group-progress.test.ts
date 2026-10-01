import { describe, expect, it } from "vitest"
import { getGroupProgress } from "./group-progress"
import { makeGroup, makeSection, makeTask } from "@/test/ui-fixtures"

describe("getGroupProgress", () => {
    it("is empty without tasks", () => {
        expect(getGroupProgress(makeGroup())).toEqual({ done: 0, total: 0, percent: 0 })
        expect(getGroupProgress(makeGroup({ sections: [makeSection()] })).total).toBe(0)
    })

    it("counts nested subtasks across sections", () => {
        const group = makeGroup({
            sections: [
                makeSection({
                    tasks: [
                        makeTask({
                            id: 1,
                            completed: true,
                            subtasks: [
                                makeTask({ id: 2, completed: false, subtasks: [makeTask({ id: 3, completed: true })] }),
                            ],
                        }),
                    ],
                }),
                makeSection({ id: 2, tasks: [makeTask({ id: 4, completed: false })] }),
            ],
        })
        expect(getGroupProgress(group)).toEqual({ done: 2, total: 4, percent: 50 })
    })

    it("is 100% when everything is done", () => {
        const group = makeGroup({
            sections: [makeSection({ tasks: [makeTask({ completed: true, subtasks: [makeTask({ id: 2, completed: true })] })] })],
        })
        expect(getGroupProgress(group)).toEqual({ done: 2, total: 2, percent: 100 })
    })
})
