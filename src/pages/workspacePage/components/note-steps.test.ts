import { describe, expect, it } from "vitest"
import type { NoteDataTree } from "@/types/types"
import { makeGroup, makeSection, makeTask } from "@/test/ui-fixtures"
import { moveGroupInList } from "./note-dnd"
import { getGroupStep, getSectionStep, getTaskStep } from "./note-steps"

/*
 * group 1 (position 0): S1 [A, B(done), C [C1, C2]], S2 [D]
 * group 2 (position 1): S3 []
 * group 3 (position 2): S4 [E]
 */
const top = (id: number, sectionID: number, text: string, over: Partial<ReturnType<typeof makeTask>> = {}) =>
    makeTask({ id, sectionID, taskID: null, text, ...over })

function buildTree(): NoteDataTree {
    const c1 = makeTask({ id: 31, sectionID: 1, taskID: 3, text: "C1" })
    const c2 = makeTask({ id: 32, sectionID: 1, taskID: 3, text: "C2" })
    return {
        groups: [
            // The groups are given out of order on purpose: steps follow the position, not the array order
            makeGroup({ id: 3, position: 2, sections: [makeSection({ id: 4, groupID: 3, tasks: [top(5, 4, "E")] })] }),
            makeGroup({
                id: 1, position: 0, sections: [
                    makeSection({ id: 1, groupID: 1, tasks: [top(1, 1, "A"), top(2, 1, "B", { completed: true }), top(3, 1, "C", { subtasks: [c1, c2] })] }),
                    makeSection({ id: 2, groupID: 1, tasks: [top(4, 2, "D")] }),
                ],
            }),
            makeGroup({ id: 2, position: 1, sections: [makeSection({ id: 3, groupID: 2 })] }),
        ],
    }
}

describe("getTaskStep", () => {
    it("moves a task down by jumping over the next sibling", () => {
        expect(getTaskStep(buildTree(), 1, 1, false)).toEqual({ sectionId: 1, parentTaskId: null, index: 1 })
    })

    it("moves a task up by jumping over the previous sibling", () => {
        expect(getTaskStep(buildTree(), 3, -1, false)).toEqual({ sectionId: 1, parentTaskId: null, index: 1 })
    })

    it("has nowhere to go from the first (up) and last (down) position", () => {
        expect(getTaskStep(buildTree(), 1, -1, false)).toBeNull()
        expect(getTaskStep(buildTree(), 3, 1, false)).toBeNull()
        expect(getTaskStep(buildTree(), 4, 1, false)).toBeNull()
    })

    it("works among the subtasks of a task", () => {
        expect(getTaskStep(buildTree(), 31, 1, false)).toEqual({ sectionId: 1, parentTaskId: 3, index: 1 })
        expect(getTaskStep(buildTree(), 32, -1, false)).toEqual({ sectionId: 1, parentTaskId: 3, index: 0 })
        expect(getTaskStep(buildTree(), 31, -1, false)).toBeNull()
    })

    it("jumps over the completed tasks while they are hidden", () => {
        // A down: B (index 1) is hidden, so it jumps over C (index 2)
        expect(getTaskStep(buildTree(), 1, 1, true)).toEqual({ sectionId: 1, parentTaskId: null, index: 2 })
        // C up: B is hidden, so it jumps over A
        expect(getTaskStep(buildTree(), 3, -1, true)).toEqual({ sectionId: 1, parentTaskId: null, index: 0 })
        // ...and over a visible sibling it is the plain next one
        expect(getTaskStep(buildTree(), 1, 1, false)?.index).toBe(1)
    })

    it("gives the expected order once applied (the index is the final one among the siblings)", () => {
        const order = (ids: number[], id: number, index: number) => { const rest = ids.filter(x => x !== id); rest.splice(index, 0, id); return rest }
        expect(order([1, 2, 3], 1, getTaskStep(buildTree(), 1, 1, false)!.index)).toEqual([2, 1, 3])
        expect(order([1, 2, 3], 3, getTaskStep(buildTree(), 3, -1, false)!.index)).toEqual([1, 3, 2])
        expect(order([1, 2, 3], 1, getTaskStep(buildTree(), 1, 1, true)!.index)).toEqual([2, 3, 1])
    })

    it("is null for an unknown task", () => {
        expect(getTaskStep(buildTree(), 999, 1, false)).toBeNull()
    })
})

describe("getSectionStep", () => {
    it("moves a section within its group", () => {
        expect(getSectionStep(buildTree(), 1, 1)).toEqual({ type: "group", groupId: 1, index: 1 })
        expect(getSectionStep(buildTree(), 2, -1)).toEqual({ type: "group", groupId: 1, index: 0 })
    })

    it("is null at the ends and for a section alone in its group", () => {
        expect(getSectionStep(buildTree(), 1, -1)).toBeNull()
        expect(getSectionStep(buildTree(), 2, 1)).toBeNull()
        expect(getSectionStep(buildTree(), 3, 1)).toBeNull()
        expect(getSectionStep(buildTree(), 3, -1)).toBeNull()
    })
})

describe("getGroupStep", () => {
    it("follows the position of the groups, not the order of the array", () => {
        expect(getGroupStep(buildTree(), 1, 1)).toBe(1)
        expect(getGroupStep(buildTree(), 2, -1)).toBe(0)
        expect(getGroupStep(buildTree(), 3, -1)).toBe(1)
    })

    it("is null at the ends", () => {
        expect(getGroupStep(buildTree(), 1, -1)).toBeNull()
        expect(getGroupStep(buildTree(), 3, 1)).toBeNull()
    })

    it("is accepted by moveGroupInList: the groups end up swapped", () => {
        const tree = buildTree()
        const moved = moveGroupInList(tree.groups, 1, getGroupStep(tree, 1, 1)!)
        expect(moved?.map(group => group.id)).toEqual([2, 1, 3])
    })
})
