import { describe, expect, it } from "vitest"
import { buildPositionUpdate } from "@/db/queries/ordering"
import { moveTask, patchTask, removeSection, removeTask } from "@/contexts/note-tree-ops"
import { layout, makeRule, makeTree, taskOf } from "@/test/automation-fixtures"
import { diffTaskStatements, restoreTasks, taskChanges } from "./diff"
import { runAutomations } from "./engine"

const base = () => makeTree({
    1: [{ id: 10, subs: [{ id: 11 }, { id: 12 }] }, { id: 13 }],
    2: [{ id: 20 }],
    3: [],
})

describe("diffTaskStatements", () => {
    it("returns nothing when the trees are the same or equal", () => {
        const tree = base()
        expect(diffTaskStatements(tree, tree)).toEqual([])
        expect(diffTaskStatements(tree, base())).toEqual([])
    })

    it("writes only the changed flag columns", () => {
        const before = base()
        expect(diffTaskStatements(before, patchTask(before, 13, { completed: true }))).toEqual([
            { sql: "UPDATE task SET completed = ? WHERE id = ?", params: [1, 13] },
        ])
        expect(diffTaskStatements(before, patchTask(before, 13, { priority: true }))).toEqual([
            { sql: "UPDATE task SET priority = ? WHERE id = ?", params: [1, 13] },
        ])
        expect(diffTaskStatements(before, patchTask(before, 13, { color: "#ff0000" }))).toEqual([
            { sql: "UPDATE task SET color = ? WHERE id = ?", params: ["#ff0000", 13] },
        ])
    })

    it("writes several changed columns of a task in one statement, in a fixed order", () => {
        const before = patchTask(base(), 13, { completed: true, priority: true, color: "#00ff00" })
        const after = patchTask(before, 13, { completed: false, priority: false, color: null })
        expect(diffTaskStatements(before, after)).toEqual([
            { sql: "UPDATE task SET completed = ?, priority = ?, color = ? WHERE id = ?", params: [0, 0, null, 13] },
        ])
    })

    it("treats an undefined color like null", () => {
        const before = base()
        const after = patchTask(before, 13, { color: undefined })
        expect(diffTaskStatements(before, after)).toEqual([])
    })

    it("a move produces the recursive subtree update and the position updates of both lists", () => {
        const before = base()
        const after = moveTask(before, 10, { sectionId: 2, parentTaskId: null }, 0)
        const statements = diffTaskStatements(before, after)
        expect(statements).toHaveLength(3)
        expect(statements[0].sql).toContain("WITH RECURSIVE subtree")
        expect(statements[0].sql).toContain("UPDATE task SET")
        expect(statements[0].params).toEqual([10, 2, 10, null, 10])
        // source list first (as it appears in the tree), then destination
        expect(statements.slice(1)).toEqual([buildPositionUpdate("task", [13]), buildPositionUpdate("task", [10, 20])])
    })

    it("an emptied list gets no position update", () => {
        const before = makeTree({ 1: [{ id: 10 }], 2: [] })
        const after = moveTask(before, 10, { sectionId: 2, parentTaskId: null }, 0)
        const statements = diffTaskStatements(before, after)
        expect(statements).toHaveLength(2)
        expect(statements[1]).toEqual(buildPositionUpdate("task", [10]))
    })

    it("moving a task under another task sets the new parent", () => {
        const before = base()
        const after = moveTask(before, 13, { sectionId: 1, parentTaskId: 12 }, 0)
        const statements = diffTaskStatements(before, after)
        expect(statements[0].params).toEqual([13, 1, 13, 12, 13])
    })

    it("a reorder inside a list only renumbers it", () => {
        const before = base()
        const after = moveTask(before, 13, { sectionId: 1, parentTaskId: null }, 0)
        expect(diffTaskStatements(before, after)).toEqual([buildPositionUpdate("task", [13, 10])])
    })

    it("a move plus a flag change in the same task", () => {
        const before = base()
        const after = patchTask(moveTask(before, 13, { sectionId: 3, parentTaskId: null }, 0), 13, { priority: true })
        const statements = diffTaskStatements(before, after)
        expect(statements.map(s => s.sql.startsWith("WITH") ? "move" : s.sql.startsWith("UPDATE task SET priority") ? "flag" : "pos")).toEqual(["move", "flag", "pos", "pos"])
    })

    it("ignores tasks present in only one tree", () => {
        const before = base()
        const after = removeTask(before, 20)
        expect(diffTaskStatements(before, after)).toEqual([])
    })
})


describe("taskChanges", () => {
    it("is empty for equal trees", () => {
        expect(taskChanges(base(), base(), [10, 11, 12, 13, 20])).toEqual([])
    })

    it("reports which parts differ, only for the given ids", () => {
        const before = base()
        const moved = moveTask(before, 13, { sectionId: 2, parentTaskId: null }, 0)
        // 20 only shifted its index: it is a change of place when asked for
        expect(taskChanges(before, moved, [13, 20, 10])).toEqual([
            { id: 13, place: true, completed: false, priority: false, color: false },
            { id: 20, place: true, completed: false, priority: false, color: false },
        ])
        expect(taskChanges(before, moved, [])).toEqual([])
        expect(taskChanges(before, patchTask(before, 11, { completed: true }), [11])).toEqual([
            { id: 11, place: false, completed: true, priority: false, color: false },
        ])
        expect(taskChanges(before, patchTask(before, 12, { color: "#fff", priority: true }), [12])).toEqual([
            { id: 12, place: false, completed: false, priority: true, color: true },
        ])
    })

    it("omits missing ids", () => {
        const before = removeTask(base(), 20)
        expect(taskChanges(before, base(), [20, 999])).toEqual([])
        expect(taskChanges(base(), before, [20])).toEqual([])
    })
})

describe("restoreTasks", () => {
    const rules = [
        makeRule(1, { type: "task.completed", sectionId: 1 }, [{ type: "moveTo", sectionId: 2, at: "top" }, { type: "setColor", color: "#ff0000" }]),
        makeRule(2, { type: "task.movedInto", sectionId: 2 }, [{ type: "setPriority", value: true }]),
    ]
    const run = () => {
        const before = patchTask(base(), 13, { completed: true })
        const outcome = runAutomations(before, rules, { type: "task.completed", taskId: 13 })
        return { before, ...outcome }
    }

    it("undoes an automation: the diff against the original is empty", () => {
        const { before, tree: after, touched } = run()
        expect(layout(after)).toEqual({ 1: [10], 2: [13, 20], 3: [] })
        const restored = restoreTasks(after, before, taskChanges(before, after, touched))
        expect(diffTaskStatements(before, restored)).toEqual([])
        expect(layout(restored)).toEqual(layout(before))
        expect(taskChanges(before, restored, touched)).toEqual([])
    })

    it("redoes an automation on the original tree", () => {
        const { before, tree: after, touched } = run()
        const redone = restoreTasks(before, after, taskChanges(after, before, touched))
        expect(diffTaskStatements(after, redone)).toEqual([])
    })

    it("restores subtasks, moves included, with their place under the parent", () => {
        const before = base()
        const after = moveTask(patchTask(before, 11, { completed: true }), 11, { sectionId: 1, parentTaskId: 12 }, 0)
        const restored = restoreTasks(after, before, taskChanges(before, after, [11]))
        expect(diffTaskStatements(before, restored)).toEqual([])
    })

    it("keeps later edits of a bystander and of fields the automation did not change", () => {
        const { before, tree: after, touched } = run()
        expect(touched).toEqual([13])
        // 20 only shifted; 13 got a priority/color/place change but its text-independent fields below were not touched
        const latest = patchTask(patchTask(after, 20, { color: "#00ff00" }), 13, { completed: false })
        const restored = restoreTasks(latest, before, taskChanges(before, after, touched))
        expect(taskOf(restored, 20).color).toBe("#00ff00")
        // completed was not changed by the automation: the later edit stays
        expect(taskOf(restored, 13).completed).toBe(false)
        // what the automation changed is undone
        expect(taskOf(restored, 13).sectionID).toBe(1)
        expect(taskOf(restored, 13).color).toBeNull()
        expect(taskOf(restored, 13).priority).toBe(false)
    })

    it("skips tasks that no longer exist", () => {
        const { before, tree: after, touched } = run()
        const latest = removeTask(after, 13)
        expect(restoreTasks(latest, before, taskChanges(before, after, touched))).toEqual(latest)
    })

    it("skips a task whose destination section no longer exists", () => {
        const { before, tree: after } = run()
        const latest = removeSection(after, 1)
        const restored = restoreTasks(latest, before, [{ id: 13, place: true, completed: false, priority: false, color: false }])
        expect(layout(restored)).toEqual(layout(latest))
    })

    it("skips a subtask whose parent no longer exists", () => {
        const before = base()
        const after = patchTask(before, 11, { completed: true })
        const latest = removeTask(after, 10)
        expect(restoreTasks(latest, before, [{ id: 11, place: true, completed: true, priority: false, color: false }])).toBe(latest)
    })

    it("does nothing without changes", () => {
        const tree = base()
        expect(restoreTasks(tree, base(), [])).toBe(tree)
    })
})
