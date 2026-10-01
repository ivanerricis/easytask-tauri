import { describe, expect, it } from "vitest"
import { makeTask } from "@/test/ui-fixtures"
import { countTasks } from "../groups/group-progress"
import { countHiddenCompleted, visibleTasks } from "./hide-completed"

describe("hide completed tasks", () => {
    const open = makeTask({ id: 1, text: "open" })
    const done = makeTask({ id: 2, text: "done", completed: true, subtasks: [makeTask({ id: 21, completed: true }), makeTask({ id: 22 })] })
    const openWithDone = makeTask({ id: 3, text: "parent", subtasks: [makeTask({ id: 31, completed: true }), makeTask({ id: 32 })] })
    const tasks = [open, done, openWithDone]

    it("keeps every task when hiding is off (same array)", () => {
        expect(visibleTasks(tasks, false)).toBe(tasks)
    })

    it("drops the completed tasks, keeping the order of the others", () => {
        expect(visibleTasks(tasks, true).map(t => t.id)).toEqual([1, 3])
    })

    it("filters the subtasks the same way", () => {
        expect(visibleTasks(openWithDone.subtasks, true).map(t => t.id)).toEqual([32])
    })

    it("counts the hidden completed tasks, including completed subtasks of a hidden task but not open ones", () => {
        // done (1) + its completed subtask 21 (1) + completed subtask 31 of a visible task (1); open 22 and 32 are not completed
        expect(countHiddenCompleted(tasks)).toBe(3)
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
