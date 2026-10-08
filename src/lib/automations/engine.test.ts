import { describe, expect, it } from "vitest"
import { layout, makeRule, makeTree, taskOf, type TaskSpec } from "@/test/automation-fixtures"
import { allSubtasksCompleted, MAX_AUTOMATION_STEPS, runAutomations } from "./engine"
import type { AutomationEvent } from "./types"

const completed = (taskId: number): AutomationEvent => ({ type: "task.completed", taskId })

describe("allSubtasksCompleted", () => {
    it("is false without subtasks", () => {
        expect(allSubtasksCompleted(taskOf(makeTree({ 1: [{ id: 1 }] }), 1))).toBe(false)
    })

    it("needs every subtask, at any depth, to be completed", () => {
        const done = makeTree({ 1: [{ id: 1, subs: [{ id: 2, completed: true, subs: [{ id: 3, completed: true }] }] }] })
        expect(allSubtasksCompleted(taskOf(done, 1))).toBe(true)
        const deepOpen = makeTree({ 1: [{ id: 1, subs: [{ id: 2, completed: true, subs: [{ id: 3 }] }] }] })
        expect(allSubtasksCompleted(taskOf(deepOpen, 1))).toBe(false)
        const someOpen = makeTree({ 1: [{ id: 1, subs: [{ id: 2, completed: true }, { id: 3 }] }] })
        expect(allSubtasksCompleted(taskOf(someOpen, 1))).toBe(false)
    })
})

describe("task.completed", () => {
    const base = () => makeTree({ 1: [{ id: 10, completed: true }, { id: 11 }], 2: [{ id: 20 }, { id: 21 }] })

    it("moves the task to the bottom of a section", () => {
        const rule = makeRule(1, { type: "task.completed", sectionId: null }, [{ type: "moveTo", sectionId: 2, at: "bottom" }])
        const { tree, applied } = runAutomations(base(), [rule], completed(10))
        expect(layout(tree)).toEqual({ 1: [11], 2: [20, 21, 10] })
        expect(applied).toEqual([rule])
        expect(taskOf(tree, 10).sectionID).toBe(2)
    })

    it("moves the task to the top of a section", () => {
        const rule = makeRule(1, { type: "task.completed", sectionId: null }, [{ type: "moveTo", sectionId: 2, at: "top" }])
        expect(layout(runAutomations(base(), [rule], completed(10)).tree)).toEqual({ 1: [11], 2: [10, 20, 21] })
    })

    it("applies the section filter", () => {
        const specific = makeRule(1, { type: "task.completed", sectionId: 1 }, [{ type: "setPriority", value: true }])
        expect(taskOf(runAutomations(base(), [specific], completed(10)).tree, 10).priority).toBe(true)
        const other = makeRule(2, { type: "task.completed", sectionId: 2 }, [{ type: "setPriority", value: true }])
        const input = base()
        const outcome = runAutomations(input, [other], completed(10))
        expect(outcome.tree).toBe(input)
        expect(outcome.applied).toEqual([])
    })

    it("does not fire when the task is not completed any more", () => {
        const input = makeTree({ 1: [{ id: 10 }], 2: [] })
        const rule = makeRule(1, { type: "task.completed", sectionId: null }, [{ type: "moveTo", sectionId: 2, at: "top" }])
        expect(runAutomations(input, [rule], completed(10)).tree).toBe(input)
    })

    it("ignores subtasks", () => {
        const input = makeTree({ 1: [{ id: 10, subs: [{ id: 11, completed: true }, { id: 12 }] }], 2: [] })
        const rule = makeRule(1, { type: "task.completed", sectionId: null }, [{ type: "setPriority", value: true }])
        const outcome = runAutomations(input, [rule], completed(11))
        expect(outcome.tree).toBe(input)
        expect(outcome.applied).toEqual([])
    })

    it("ignores an unknown task", () => {
        const input = base()
        const rule = makeRule(1, { type: "task.completed", sectionId: null }, [{ type: "setPriority", value: true }])
        expect(runAutomations(input, [rule], completed(999)).tree).toBe(input)
    })

    it("does not fire on other event types", () => {
        const input = base()
        const rule = makeRule(1, { type: "task.completed", sectionId: null }, [{ type: "setPriority", value: true }])
        expect(runAutomations(input, [rule], { type: "task.reopened", taskId: 10 }).tree).toBe(input)
    })
})

describe("task.reopened and task.created", () => {
    it("reopened fires for an open top level task", () => {
        const input = makeTree({ 1: [{ id: 10, priority: true }], 2: [] })
        const rule = makeRule(1, { type: "task.reopened", sectionId: 1 }, [{ type: "moveTo", sectionId: 2, at: "top" }, { type: "setPriority", value: false }])
        const { tree } = runAutomations(input, [rule], { type: "task.reopened", taskId: 10 })
        expect(layout(tree)).toEqual({ 1: [], 2: [10] })
        expect(taskOf(tree, 10).priority).toBe(false)
    })

    it("reopened does not fire when the task is still completed", () => {
        const input = makeTree({ 1: [{ id: 10, completed: true }] })
        const rule = makeRule(1, { type: "task.reopened", sectionId: null }, [{ type: "setPriority", value: true }])
        expect(runAutomations(input, [rule], { type: "task.reopened", taskId: 10 }).tree).toBe(input)
    })

    it("created colors the new task, only in the right section", () => {
        const input = makeTree({ 1: [{ id: 10 }], 2: [{ id: 20 }] })
        const rule = makeRule(1, { type: "task.created", sectionId: 1 }, [{ type: "setColor", color: "#ff0000" }])
        expect(taskOf(runAutomations(input, [rule], { type: "task.created", taskId: 10 }).tree, 10).color).toBe("#ff0000")
        expect(runAutomations(input, [rule], { type: "task.created", taskId: 20 }).tree).toBe(input)
    })

    it("created ignores a subtask", () => {
        const input = makeTree({ 1: [{ id: 10, subs: [{ id: 11 }] }] })
        const rule = makeRule(1, { type: "task.created", sectionId: null }, [{ type: "setColor", color: "#ff0000" }])
        expect(runAutomations(input, [rule], { type: "task.created", taskId: 11 }).tree).toBe(input)
    })
})

describe("task.movedInto", () => {
    it("fires only when the task comes from another section", () => {
        const input = makeTree({ 1: [], 2: [{ id: 10 }] })
        const rule = makeRule(1, { type: "task.movedInto", sectionId: 2 }, [{ type: "setPriority", value: true }])
        expect(runAutomations(input, [rule], { type: "task.moved", taskId: 10, fromSectionId: 1 }).applied).toEqual([rule])
        // a reorder inside the section is reported with the same section
        expect(runAutomations(input, [rule], { type: "task.moved", taskId: 10, fromSectionId: 2 }).tree).toBe(input)
    })

    it("does not fire for another destination", () => {
        const input = makeTree({ 1: [{ id: 10 }], 2: [] })
        const rule = makeRule(1, { type: "task.movedInto", sectionId: 2 }, [{ type: "setPriority", value: true }])
        expect(runAutomations(input, [rule], { type: "task.moved", taskId: 10, fromSectionId: 2 }).tree).toBe(input)
    })

    it("chains: a rule moves to S2, another one on movedInto S2 sets the priority", () => {
        const input = makeTree({ 1: [{ id: 10, completed: true }], 2: [{ id: 20 }] })
        const a = makeRule(1, { type: "task.completed", sectionId: 1 }, [{ type: "moveTo", sectionId: 2, at: "top" }])
        const b = makeRule(2, { type: "task.movedInto", sectionId: 2 }, [{ type: "setPriority", value: true }])
        const { tree, applied } = runAutomations(input, [a, b], completed(10))
        expect(layout(tree)).toEqual({ 1: [], 2: [10, 20] })
        expect(taskOf(tree, 10).priority).toBe(true)
        expect(applied).toEqual([a, b])
    })

    it("a rule listed before the one that moves the task still runs in the chain", () => {
        const input = makeTree({ 1: [{ id: 10, completed: true }], 2: [] })
        const b = makeRule(1, { type: "task.movedInto", sectionId: 2 }, [{ type: "setPriority", value: true }])
        const a = makeRule(2, { type: "task.completed", sectionId: 1 }, [{ type: "moveTo", sectionId: 2, at: "top" }])
        const { tree } = runAutomations(input, [b, a], completed(10))
        expect(taskOf(tree, 10).priority).toBe(true)
    })
})

describe("subtasks.completed", () => {
    it("fires when the last subtask is completed and acts on the parent", () => {
        const input = makeTree({ 1: [{ id: 10, subs: [{ id: 11, completed: true }, { id: 12, completed: true }] }], 2: [] })
        const rule = makeRule(1, { type: "subtasks.completed", sectionId: null }, [{ type: "moveTo", sectionId: 2, at: "bottom" }])
        const { tree, applied } = runAutomations(input, [rule], completed(12))
        expect(layout(tree)).toEqual({ 1: [], 2: [10] })
        expect(applied).toEqual([rule])
    })

    it("does not fire while a subtask is open", () => {
        const input = makeTree({ 1: [{ id: 10, subs: [{ id: 11, completed: true }, { id: 12 }] }], 2: [] })
        const rule = makeRule(1, { type: "subtasks.completed", sectionId: null }, [{ type: "setPriority", value: true }])
        expect(runAutomations(input, [rule], completed(11)).tree).toBe(input)
    })

    it("respects the section filter", () => {
        const input = makeTree({ 1: [{ id: 10, subs: [{ id: 11, completed: true }] }], 2: [] })
        const rule = makeRule(1, { type: "subtasks.completed", sectionId: 2 }, [{ type: "setPriority", value: true }])
        expect(runAutomations(input, [rule], completed(11)).tree).toBe(input)
    })

    it("works with nested subtasks: the parent is the direct parent of the completed task", () => {
        const input = makeTree({ 1: [{ id: 10, subs: [{ id: 11, subs: [{ id: 12, completed: true }] }] }] })
        const rule = makeRule(1, { type: "subtasks.completed", sectionId: null }, [{ type: "setColor", color: "#00ff00" }])
        const { tree } = runAutomations(input, [rule], completed(12))
        expect(taskOf(tree, 11).color).toBe("#00ff00")
        // 11 itself is still open, so 10 did not get its subtasks completed
        expect(taskOf(tree, 10).color).toBeNull()
    })

    it("cascades upward through several levels with a setCompleted rule", () => {
        const input = makeTree({ 1: [{ id: 10, subs: [{ id: 11, subs: [{ id: 12, completed: true }] }] }] })
        const rule = makeRule(1, { type: "subtasks.completed", sectionId: null }, [{ type: "setCompleted", value: true }])
        const { tree } = runAutomations(input, [rule], completed(12))
        expect(taskOf(tree, 11).completed).toBe(true)
        expect(taskOf(tree, 10).completed).toBe(true)
    })

    it("the cascade reaches the top level task, which then raises task.completed", () => {
        const input = makeTree({ 1: [{ id: 10, subs: [{ id: 11, completed: true }] }], 2: [] })
        const complete = makeRule(1, { type: "subtasks.completed", sectionId: null }, [{ type: "setCompleted", value: true }])
        const move = makeRule(2, { type: "task.completed", sectionId: 1 }, [{ type: "moveTo", sectionId: 2, at: "top" }])
        const { tree, applied } = runAutomations(input, [complete, move], completed(11))
        expect(layout(tree)).toEqual({ 1: [], 2: [10] })
        expect(taskOf(tree, 10).completed).toBe(true)
        expect(applied).toEqual([complete, move])
    })

    it("completeSubtasks completes every subtask and raises subtasks.completed", () => {
        const input = makeTree({ 1: [{ id: 10, completed: true, subs: [{ id: 11, subs: [{ id: 12 }] }, { id: 13 }] }], 2: [] })
        const complete = makeRule(1, { type: "task.completed", sectionId: null }, [{ type: "completeSubtasks" }])
        const mark = makeRule(2, { type: "subtasks.completed", sectionId: null }, [{ type: "setColor", color: "#123456" }])
        const { tree, applied } = runAutomations(input, [complete, mark], completed(10))
        for (const id of [11, 12, 13]) expect(taskOf(tree, id).completed).toBe(true)
        expect(taskOf(tree, 10).color).toBe("#123456")
        expect(applied).toEqual([complete, mark])
    })

    it("completeSubtasks is a no-op without subtasks or when all are completed", () => {
        const rule = makeRule(1, { type: "task.completed", sectionId: null }, [{ type: "completeSubtasks" }])
        const none = makeTree({ 1: [{ id: 10, completed: true }] })
        expect(runAutomations(none, [rule], completed(10))).toEqual({ tree: none, applied: [], touched: [] })
        const all = makeTree({ 1: [{ id: 10, completed: true, subs: [{ id: 11, completed: true }] }] })
        expect(runAutomations(all, [rule], completed(10)).tree).toBe(all)
    })
})

describe("actions", () => {
    it("setPriority / setColor / setCompleted that change nothing keep the tree and are not applied", () => {
        const input = makeTree({ 1: [{ id: 10, completed: true, priority: true, color: "#abcdef" }] })
        const rules = [
            makeRule(1, { type: "task.completed", sectionId: null }, [{ type: "setPriority", value: true }]),
            makeRule(2, { type: "task.completed", sectionId: null }, [{ type: "setColor", color: "#abcdef" }]),
            makeRule(3, { type: "task.completed", sectionId: null }, [{ type: "setCompleted", value: true }]),
        ]
        const outcome = runAutomations(input, rules, completed(10))
        expect(outcome.tree).toBe(input)
        expect(outcome.applied).toEqual([])
    })

    it("setColor null removes the color", () => {
        const input = makeTree({ 1: [{ id: 10, completed: true, color: "#abcdef" }] })
        const rule = makeRule(1, { type: "task.completed", sectionId: null }, [{ type: "setColor", color: null }])
        expect(taskOf(runAutomations(input, [rule], completed(10)).tree, 10).color).toBeNull()
    })

    it("a rule with several actions is applied when only one of them changes something", () => {
        const input = makeTree({ 1: [{ id: 10, completed: true, priority: true }] })
        const rule = makeRule(1, { type: "task.completed", sectionId: null }, [{ type: "setPriority", value: true }, { type: "setColor", color: "#111111" }])
        const outcome = runAutomations(input, [rule], completed(10))
        expect(outcome.applied).toEqual([rule])
        expect(taskOf(outcome.tree, 10).color).toBe("#111111")
    })

    it("moveTo the place the task already has is a no-op", () => {
        const input = makeTree({ 1: [{ id: 10, completed: true }, { id: 11 }] })
        const top = makeRule(1, { type: "task.completed", sectionId: null }, [{ type: "moveTo", sectionId: 1, at: "top" }])
        expect(runAutomations(input, [top], completed(10)).tree).toBe(input)
        const bottom = makeRule(2, { type: "task.completed", sectionId: null }, [{ type: "moveTo", sectionId: 1, at: "bottom" }])
        expect(layout(runAutomations(input, [bottom], completed(10)).tree)).toEqual({ 1: [11, 10] })
    })

    it("moveTo within the same section reorders without raising task.moved", () => {
        const input = makeTree({ 1: [{ id: 10, completed: true }, { id: 11 }] })
        const move = makeRule(1, { type: "task.completed", sectionId: null }, [{ type: "moveTo", sectionId: 1, at: "bottom" }])
        const into = makeRule(2, { type: "task.movedInto", sectionId: 1 }, [{ type: "setPriority", value: true }])
        const { tree } = runAutomations(input, [move, into], completed(10))
        expect(layout(tree)).toEqual({ 1: [11, 10] })
        expect(taskOf(tree, 10).priority).toBe(false)
    })

    it("moveTo never moves a subtask", () => {
        const input = makeTree({ 1: [{ id: 10, subs: [{ id: 11, subs: [{ id: 12, completed: true }] }] }], 2: [] })
        const move = makeRule(1, { type: "subtasks.completed", sectionId: null }, [{ type: "moveTo", sectionId: 2, at: "top" }])
        const outcome = runAutomations(input, [move], completed(12))
        expect(outcome.tree).toBe(input)
        expect(outcome.applied).toEqual([])
        expect(layout(outcome.tree)).toEqual({ 1: [10], 2: [] })
    })

    it("moves a task with its subtree and updates the section of the subtasks", () => {
        const input = makeTree({ 1: [{ id: 10, completed: true, subs: [{ id: 11 }] }], 2: [] })
        const rule = makeRule(1, { type: "task.completed", sectionId: null }, [{ type: "moveTo", sectionId: 2, at: "top" }])
        const { tree } = runAutomations(input, [rule], completed(10))
        expect(taskOf(tree, 11).sectionID).toBe(2)
        expect(taskOf(tree, 11).taskID).toBe(10)
    })
})

describe("touched", () => {
    it("lists the tasks an action changed, not the ones that only shifted", () => {
        const input = makeTree({ 1: [{ id: 10, completed: true }], 2: [{ id: 20 }] })
        const rule = makeRule(1, { type: "task.completed", sectionId: null }, [{ type: "moveTo", sectionId: 2, at: "top" }])
        const outcome = runAutomations(input, [rule], completed(10))
        expect(outcome.touched).toEqual([10])
        expect(outcome.touched).not.toContain(20)
    })

    it("is empty for no-op actions and when nothing runs", () => {
        const input = makeTree({ 1: [{ id: 10, completed: true, priority: true }] })
        const noop = makeRule(1, { type: "task.completed", sectionId: null }, [{ type: "setPriority", value: true }])
        expect(runAutomations(input, [noop], completed(10)).touched).toEqual([])
        expect(runAutomations(input, [], completed(10)).touched).toEqual([])
    })

    it("completeSubtasks touches the task and all its descendants", () => {
        const input = makeTree({ 1: [{ id: 10, completed: true, subs: [{ id: 11, subs: [{ id: 12 }] }, { id: 13 }] }] })
        const rule = makeRule(1, { type: "task.completed", sectionId: null }, [{ type: "completeSubtasks" }])
        expect(runAutomations(input, [rule], completed(10)).touched.sort()).toEqual([10, 11, 12, 13])
    })

    it("collects the tasks of a whole chain", () => {
        const input = makeTree({ 1: [{ id: 10, subs: [{ id: 11, subs: [{ id: 12, completed: true }] }] }] })
        const rule = makeRule(1, { type: "subtasks.completed", sectionId: null }, [{ type: "setCompleted", value: true }])
        expect(runAutomations(input, [rule], completed(12)).touched.sort()).toEqual([10, 11])
    })
})

describe("rule selection", () => {
    it("skips disabled rules", () => {
        const input = makeTree({ 1: [{ id: 10, completed: true }] })
        const rule = makeRule(1, { type: "task.completed", sectionId: null }, [{ type: "setPriority", value: true }], { enabled: false })
        const outcome = runAutomations(input, [rule], completed(10))
        expect(outcome.tree).toBe(input)
        expect(outcome.applied).toEqual([])
    })

    it("skips rules whose trigger section is missing", () => {
        const input = makeTree({ 1: [{ id: 10, completed: true }] })
        const rule = makeRule(1, { type: "task.completed", sectionId: 99 }, [{ type: "setPriority", value: true }])
        expect(runAutomations(input, [rule], completed(10)).tree).toBe(input)
    })

    it("skips rules whose move target is missing, without running their other actions", () => {
        const input = makeTree({ 1: [{ id: 10, completed: true }] })
        const rule = makeRule(1, { type: "task.completed", sectionId: null }, [{ type: "setPriority", value: true }, { type: "moveTo", sectionId: 99, at: "top" }])
        const outcome = runAutomations(input, [rule], completed(10))
        expect(outcome.tree).toBe(input)
        expect(outcome.applied).toEqual([])
    })

    it("runs the rules by position (then id), not by array order", () => {
        const input = makeTree({ 1: [{ id: 10, completed: true }] })
        const first = makeRule(1, { type: "task.completed", sectionId: null }, [{ type: "setColor", color: "#111111" }], { position: 5 })
        const second = makeRule(2, { type: "task.completed", sectionId: null }, [{ type: "setColor", color: "#222222" }], { position: 1 })
        const outcome = runAutomations(input, [first, second], completed(10))
        // the rule with the lower position runs first, so the other one has the last word
        expect(outcome.applied).toEqual([second, first])
        expect(taskOf(outcome.tree, 10).color).toBe("#111111")
    })

    it("breaks position ties by id", () => {
        const input = makeTree({ 1: [{ id: 10, completed: true }] })
        const a = makeRule(7, { type: "task.completed", sectionId: null }, [{ type: "setColor", color: "#777777" }], { position: 0 })
        const b = makeRule(3, { type: "task.completed", sectionId: null }, [{ type: "setColor", color: "#333333" }], { position: 0 })
        expect(runAutomations(input, [a, b], completed(10)).applied).toEqual([b, a])
    })

    it("returns the same tree with no rules", () => {
        const input = makeTree({ 1: [{ id: 10, completed: true }] })
        const outcome = runAutomations(input, [], completed(10))
        expect(outcome.tree).toBe(input)
        expect(outcome.applied).toEqual([])
    })

    it("does not mutate the input tree", () => {
        const input = makeTree({ 1: [{ id: 10, completed: true }], 2: [] })
        const snapshot = JSON.stringify(input)
        const rule = makeRule(1, { type: "task.completed", sectionId: null }, [{ type: "moveTo", sectionId: 2, at: "top" }, { type: "setPriority", value: true }])
        runAutomations(input, [rule], completed(10))
        expect(JSON.stringify(input)).toBe(snapshot)
    })
})

describe("loop protection", () => {
    it("two rules bouncing a task between two sections terminate, each rule firing once per task", () => {
        const input = makeTree({ 1: [{ id: 10 }], 2: [] })
        const toTwo = makeRule(1, { type: "task.movedInto", sectionId: 1 }, [{ type: "moveTo", sectionId: 2, at: "bottom" }])
        const toOne = makeRule(2, { type: "task.movedInto", sectionId: 2 }, [{ type: "moveTo", sectionId: 1, at: "bottom" }])
        // the user moved the task from S2 to S1
        const { tree, applied } = runAutomations(input, [toTwo, toOne], { type: "task.moved", taskId: 10, fromSectionId: 2 })
        expect(applied).toEqual([toTwo, toOne])
        // S1 -> S2 (rule 1), S2 -> S1 (rule 2); rule 1 cannot fire again for the same task
        expect(layout(tree)).toEqual({ 1: [10], 2: [] })
    })

    it("a rule that moves the task out of its own destination runs once", () => {
        const input = makeTree({ 1: [{ id: 10 }, { id: 11 }], 2: [] })
        const rule = makeRule(1, { type: "task.movedInto", sectionId: 1 }, [{ type: "moveTo", sectionId: 2, at: "top" }])
        const { tree, applied } = runAutomations(input, [rule], { type: "task.moved", taskId: 10, fromSectionId: 2 })
        expect(layout(tree)).toEqual({ 1: [11], 2: [10] })
        expect(applied).toEqual([rule])
    })

    it("is bounded by MAX_AUTOMATION_STEPS", () => {
        // a chain of nested tasks, each completion completing the parent, deeper than the step limit
        const depth = MAX_AUTOMATION_STEPS + 20
        let spec: TaskSpec = { id: depth, completed: true }
        for (let id = depth - 1; id >= 1; id--) spec = { id, subs: [spec] }
        const input = makeTree({ 1: [spec] })
        const rule = makeRule(1, { type: "subtasks.completed", sectionId: null }, [{ type: "setCompleted", value: true }])
        const { tree } = runAutomations(input, [rule], completed(depth))
        expect(taskOf(tree, depth - 1).completed).toBe(true)
        // the chain stopped before reaching the root
        expect(taskOf(tree, 1).completed).toBe(false)
    })
})
