import { describe, expect, it } from "vitest"
import type { NoteDataTree } from "@/types/types"
import { makeGroup, makeSection, makeTask } from "@/test/ui-fixtures"
import {
    computeDropZone, computeGroupDropZone, computeGroupTarget, computeSectionTarget, moveGroupInList, computeTaskTarget, findSection, findTask,
    getSectionMoveDestinations, getTaskMoveDestinations,
} from "./note-dnd"

/*
 * group 1: S1 [T1 [T1a [T1a1], T1b], T2], S2 [T3]
 * group 2: S3 []
 * group 3: S4 [T4]
 */
const task = (id: number, sectionID: number, subtasks: ReturnType<typeof makeTask>[] = []) =>
    makeTask({ id, sectionID, text: `T${id}`, subtasks, taskID: null })

function buildTree(): NoteDataTree {
    const t1a1 = makeTask({ id: 13, sectionID: 1, taskID: 11, text: "T1a1" })
    const t1a = makeTask({ id: 11, sectionID: 1, taskID: 1, text: "T1a", subtasks: [t1a1] })
    const t1b = makeTask({ id: 12, sectionID: 1, taskID: 1, text: "T1b" })
    return {
        groups: [
            makeGroup({
                id: 1, position: 0, sections: [
                    makeSection({ id: 1, groupID: 1, title: "S1", tasks: [task(1, 1, [t1a, t1b]), task(2, 1)] }),
                    makeSection({ id: 2, groupID: 1, title: "S2", tasks: [task(3, 2)] }),
                ],
            }),
            makeGroup({ id: 2, position: 1, sections: [makeSection({ id: 3, groupID: 2, title: "S3" })] }),
            makeGroup({ id: 3, position: 2, sections: [makeSection({ id: 4, groupID: 3, title: "S4", tasks: [task(4, 4)] })] }),
        ],
    }
}

const rect = { top: 100, height: 40 }

describe("computeDropZone", () => {
    it("splits a task row in before / inside / after", () => {
        expect(computeDropZone("task", "task", rect, 102)).toBe("before")
        expect(computeDropZone("task", "task", rect, 120)).toBe("inside")
        expect(computeDropZone("task", "task", rect, 138)).toBe("after")
    })

    it("uses inside-start instead of after for a task with subtasks", () => {
        expect(computeDropZone("task", "task", rect, 138, { hasSubtasks: true })).toBe("inside-start")
    })

    it("splits a section card hovered by a section in before / after", () => {
        expect(computeDropZone("section", "section", rect, 110)).toBe("before")
        expect(computeDropZone("section", "section", rect, 130)).toBe("after")
    })

    it("is inside for a task over a section, a group or a new-group slot", () => {
        expect(computeDropZone("task", "section", rect, 101)).toBe("inside")
        expect(computeDropZone("section", "group", rect, 101)).toBe("inside")
        expect(computeDropZone("section", "new-group", rect, 101)).toBe("inside")
    })
})

describe("computeSectionTarget", () => {
    const tree = buildTree()

    it("reorders inside the group (final index semantics)", () => {
        expect(computeSectionTarget(tree, 1, { kind: "section", id: 2 }, "after")).toEqual({ type: "group", groupId: 1, index: 1 })
        expect(computeSectionTarget(tree, 2, { kind: "section", id: 1 }, "before")).toEqual({ type: "group", groupId: 1, index: 0 })
    })

    it("returns null for a no-op or for itself", () => {
        expect(computeSectionTarget(tree, 1, { kind: "section", id: 2 }, "before")).toBeNull()
        expect(computeSectionTarget(tree, 2, { kind: "section", id: 1 }, "after")).toBeNull()
        expect(computeSectionTarget(tree, 1, { kind: "section", id: 1 }, "after")).toBeNull()
    })

    it("moves before / after a section of another group", () => {
        expect(computeSectionTarget(tree, 1, { kind: "section", id: 4 }, "before")).toEqual({ type: "group", groupId: 3, index: 0 })
        expect(computeSectionTarget(tree, 1, { kind: "section", id: 4 }, "after")).toEqual({ type: "group", groupId: 3, index: 1 })
    })

    it("appends to a group when dropped on its empty area", () => {
        expect(computeSectionTarget(tree, 1, { kind: "group", id: 2 }, "inside")).toEqual({ type: "group", groupId: 2, index: 1 })
        expect(computeSectionTarget(tree, 1, { kind: "group", id: 1 }, "inside")).toEqual({ type: "group", groupId: 1, index: 1 })
        expect(computeSectionTarget(tree, 2, { kind: "group", id: 1 }, "inside")).toBeNull()
    })

    it("creates a new group at the slot index", () => {
        expect(computeSectionTarget(tree, 1, { kind: "new-group", id: 3 }, "inside")).toEqual({ type: "new-group", index: 3 })
        expect(computeSectionTarget(tree, 1, { kind: "new-group", id: 0 }, "inside")).toEqual({ type: "new-group", index: 0 })
    })

    it("does not offer a new group next to the group of a lone section", () => {
        // S3 is alone in group index 1: slots 1 and 2 are just a group reorder
        expect(computeSectionTarget(tree, 3, { kind: "new-group", id: 1 }, "inside")).toBeNull()
        expect(computeSectionTarget(tree, 3, { kind: "new-group", id: 2 }, "inside")).toBeNull()
        expect(computeSectionTarget(tree, 3, { kind: "new-group", id: 0 }, "inside")).toEqual({ type: "new-group", index: 0 })
    })

    it("returns null for unknown ids", () => {
        expect(computeSectionTarget(tree, 99, { kind: "group", id: 1 }, "inside")).toBeNull()
        expect(computeSectionTarget(tree, 1, { kind: "group", id: 99 }, "inside")).toBeNull()
    })
})

describe("computeTaskTarget", () => {
    const tree = buildTree()

    it("inherits the parent of the hovered task for before / after", () => {
        expect(computeTaskTarget(tree, 3, { kind: "task", id: 1 }, "before")).toEqual({ sectionId: 1, parentTaskId: null, index: 0 })
        expect(computeTaskTarget(tree, 3, { kind: "task", id: 1 }, "after")).toEqual({ sectionId: 1, parentTaskId: null, index: 1 })
        // a subtask dropped next to a subtask of another task becomes its sibling
        expect(computeTaskTarget(tree, 2, { kind: "task", id: 12 }, "after")).toEqual({ sectionId: 1, parentTaskId: 1, index: 2 })
    })

    it("nests inside a task (last position, or first with inside-start)", () => {
        expect(computeTaskTarget(tree, 3, { kind: "task", id: 1 }, "inside")).toEqual({ sectionId: 1, parentTaskId: 1, index: 2 })
        expect(computeTaskTarget(tree, 3, { kind: "task", id: 1 }, "inside-start")).toEqual({ sectionId: 1, parentTaskId: 1, index: 0 })
        expect(computeTaskTarget(tree, 3, { kind: "task", id: 4 }, "inside")).toEqual({ sectionId: 4, parentTaskId: 4, index: 0 })
    })

    it("turns a subtask into a top level task of a section (last position)", () => {
        expect(computeTaskTarget(tree, 13, { kind: "section", id: 4 }, "inside")).toEqual({ sectionId: 4, parentTaskId: null, index: 1 })
        expect(computeTaskTarget(tree, 13, { kind: "section", id: 3 }, "inside")).toEqual({ sectionId: 3, parentTaskId: null, index: 0 })
    })

    it("moves a subtask under a task of another section and group", () => {
        expect(computeTaskTarget(tree, 13, { kind: "task", id: 4 }, "inside")).toEqual({ sectionId: 4, parentTaskId: 4, index: 0 })
    })

    it("never drops a task under itself or a descendant", () => {
        expect(computeTaskTarget(tree, 1, { kind: "task", id: 1 }, "inside")).toBeNull()
        expect(computeTaskTarget(tree, 1, { kind: "task", id: 11 }, "inside")).toBeNull()
        expect(computeTaskTarget(tree, 1, { kind: "task", id: 13 }, "after")).toBeNull()
        expect(computeTaskTarget(tree, 1, { kind: "task", id: 12 }, "before")).toBeNull()
    })

    it("returns null for no-ops", () => {
        expect(computeTaskTarget(tree, 1, { kind: "task", id: 2 }, "before")).toBeNull()
        expect(computeTaskTarget(tree, 2, { kind: "task", id: 1 }, "after")).toBeNull()
        expect(computeTaskTarget(tree, 2, { kind: "section", id: 1 }, "inside")).toBeNull()
    })

    it("reorders subtasks under the same parent", () => {
        expect(computeTaskTarget(tree, 12, { kind: "task", id: 11 }, "before")).toEqual({ sectionId: 1, parentTaskId: 1, index: 0 })
    })

    it("returns null for groups and unknown ids", () => {
        expect(computeTaskTarget(tree, 1, { kind: "group", id: 1 }, "inside")).toBeNull()
        expect(computeTaskTarget(tree, 99, { kind: "section", id: 1 }, "inside")).toBeNull()
    })
})

describe("lookups", () => {
    const tree = buildTree()
    it("finds sections and nested tasks", () => {
        expect(findSection(tree, 2)?.title).toBe("S2")
        expect(findTask(tree, 13)?.text).toBe("T1a1")
        expect(findTask(tree, 99)).toBeUndefined()
    })
})

describe("getSectionMoveDestinations", () => {
    const tree = buildTree()

    it("lists the other groups with their section titles", () => {
        const result = getSectionMoveDestinations(tree, 1)
        expect(result.groups).toEqual([
            { id: 2, label: "Gruppo 2", hint: "S3" },
            { id: 3, label: "Gruppo 3", hint: "S4" },
        ])
        expect(result.canCreateGroup).toBe(true)
        expect(result.newGroupIndex).toBe(3)
    })

    it("labels a named group with its name and the others with 'Gruppo N'", () => {
        const named = buildTree()
        named.groups[1].name = "Da fare"
        expect(getSectionMoveDestinations(named, 1).groups.map(g => g.label)).toEqual(["Da fare", "Gruppo 3"])
        expect(getTaskMoveDestinations(named, 1).find(d => d.key === "section-3")?.hint).toBe("Da fare")
    })

    it("does not offer a new group for the only section of a group", () => {
        expect(getSectionMoveDestinations(tree, 3).canCreateGroup).toBe(false)
    })
})

describe("getTaskMoveDestinations", () => {
    const tree = buildTree()
    const keys = (id: number) => getTaskMoveDestinations(tree, id).map(d => d.key)

    it("excludes the task, its subtree, its section (if top level) and its parent", () => {
        // T1 is top level of S1: no S1 entry, none of T1/T1a/T1b/T1a1
        expect(keys(1)).toEqual(["task-2", "section-2", "task-3", "section-3", "section-4", "task-4"])
    })

    it("offers the parent section for a subtask but not its current parent", () => {
        // T1a1 is a subtask of T1a: T1a excluded, S1 offered (becomes top level)
        expect(keys(13)).toEqual([
            "section-1", "task-1", "task-12", "task-2", "section-2", "task-3", "section-3", "section-4", "task-4",
        ])
    })

    it("indents the tasks under their section", () => {
        const list = getTaskMoveDestinations(tree, 3)
        expect(list.find(d => d.key === "task-11")).toMatchObject({ depth: 2, sectionId: 1, parentTaskId: 11 })
        expect(list.find(d => d.key === "section-1")).toMatchObject({ depth: 0, parentTaskId: null, hint: "Gruppo 1" })
    })

    it("returns nothing for an unknown task", () => {
        expect(keys(99)).toEqual([])
    })
})

describe("group reorder", () => {
    const ids = (groups: NoteDataTree["groups"]) => groups.map(group => group.id)

    it("splits a group horizontally in before / after", () => {
        expect(computeGroupDropZone({ left: 100, width: 200 }, 120)).toBe("before")
        expect(computeGroupDropZone({ left: 100, width: 200 }, 250)).toBe("after")
    })

    it("computes the final index before / after another group", () => {
        const tree = buildTree()
        expect(computeGroupTarget(tree, 1, { kind: "group", id: 3 }, "after")).toEqual({ index: 2 })
        expect(computeGroupTarget(tree, 1, { kind: "group", id: 3 }, "before")).toEqual({ index: 1 })
        expect(computeGroupTarget(tree, 3, { kind: "group", id: 1 }, "before")).toEqual({ index: 0 })
        expect(computeGroupTarget(tree, 3, { kind: "group", id: 2 }, "after")).toBeNull()
    })

    it("returns null for no-ops and invalid targets", () => {
        const tree = buildTree()
        expect(computeGroupTarget(tree, 1, { kind: "group", id: 1 }, "after")).toBeNull()
        expect(computeGroupTarget(tree, 1, { kind: "group", id: 2 }, "before")).toBeNull()
        expect(computeGroupTarget(tree, 2, { kind: "group", id: 1 }, "after")).toBeNull()
        expect(computeGroupTarget(tree, 1, { kind: "section", id: 3 }, "after")).toBeNull()
        expect(computeGroupTarget(tree, 1, { kind: "group", id: 99 }, "after")).toBeNull()
        expect(computeGroupTarget(tree, 99, { kind: "group", id: 1 }, "after")).toBeNull()
    })

    it("reorders and renumbers the positions", () => {
        const moved = moveGroupInList(buildTree().groups, 1, 2)!
        expect(ids(moved)).toEqual([2, 3, 1])
        expect(moved.map(group => group.position)).toEqual([0, 1, 2])
        expect(moveGroupInList(buildTree().groups, 99, 0)).toBeNull()
    })

    it("does not offer groups as a drop target for a section or task in a group-only way", () => {
        expect(computeSectionTarget(buildTree(), 4, { kind: "group", id: 1 }, "inside")).toEqual({ type: "group", groupId: 1, index: 2 })
        expect(computeTaskTarget(buildTree(), 4, { kind: "group", id: 1 }, "inside")).toBeNull()
    })
})
