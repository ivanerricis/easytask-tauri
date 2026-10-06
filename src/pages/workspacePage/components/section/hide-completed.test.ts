import { describe, expect, it } from "vitest"
import { makeTask } from "@/test/ui-fixtures"
import { countTasks } from "../groups/group-progress"
import { countHiddenCompleted, hasOpenDescendant, isHiddenTask, visibleTasks } from "./hide-completed"

describe("hide completed tasks", () => {
    const open = makeTask({ id: 1, text: "open" })
    const done = makeTask({ id: 2, text: "done", completed: true, subtasks: [makeTask({ id: 21, completed: true }), makeTask({ id: 22 })] })
    const openWithDone = makeTask({ id: 3, text: "parent", subtasks: [makeTask({ id: 31, completed: true }), makeTask({ id: 32 })] })
    const tasks = [open, done, openWithDone]

    it("keeps every task when hiding is off (same array)", () => {
        expect(visibleTasks(tasks, false)).toBe(tasks)
    })

    it("drops the fully completed subtrees, keeping a completed task that still has open work below it", () => {
        // 2 is completed but its subtask 22 is open: it stays
        expect(visibleTasks(tasks, true).map(t => t.id)).toEqual([1, 2, 3])
        const fullyDone = makeTask({ id: 4, completed: true, subtasks: [makeTask({ id: 41, completed: true })] })
        expect(visibleTasks([open, fullyDone], true).map(t => t.id)).toEqual([1])
    })

    it("looks at open descendants at any depth, and filters the children of a visible completed parent", () => {
        const deep = makeTask({ id: 5, completed: true, subtasks: [
            makeTask({ id: 51, completed: true, subtasks: [makeTask({ id: 511 })] }),
            makeTask({ id: 52, completed: true, subtasks: [makeTask({ id: 521, completed: true })] }),
        ] })
        expect(hasOpenDescendant(deep)).toBe(true)
        expect(isHiddenTask(deep, true)).toBe(false)
        expect(isHiddenTask(deep, false)).toBe(false)
        expect(visibleTasks(deep.subtasks, true).map(t => t.id)).toEqual([51])
        expect(isHiddenTask(deep.subtasks[1], true)).toBe(true)
        expect(isHiddenTask(open, true)).toBe(false)
    })

    it("filters the subtasks the same way", () => {
        expect(visibleTasks(openWithDone.subtasks, true).map(t => t.id)).toEqual([32])
    })

    it("counts exactly the tasks that are hidden", () => {
        // Only 21 (completed leaf under the visible completed 2) and 31 (under the open 3) are hidden
        expect(countHiddenCompleted(tasks)).toBe(2)
        const fullyDone = makeTask({ id: 4, completed: true, subtasks: [makeTask({ id: 41, completed: true })] })
        expect(countHiddenCompleted([fullyDone])).toBe(2)
        expect(countHiddenCompleted([open])).toBe(0)
        expect(countHiddenCompleted([])).toBe(0)
    })

    it("does not change the group progress: hiding is only a view, the whole tree is still counted", () => {
        const before = countTasks(tasks)
        visibleTasks(tasks, true)
        expect(countTasks(tasks)).toEqual(before)
        expect(before).toEqual({ done: 3, total: 7 })
    })
})
