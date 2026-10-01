import { beforeEach, describe, expect, it } from "vitest"
import type { NoteDataTree } from "@/types/types"
import { makeGroup, makeSection, makeTask } from "@/test/ui-fixtures"
import { createNoteOptimisticActions } from "./note-optimistic"

const initial = (): NoteDataTree => ({
    groups: [
        makeGroup({
            id: 1, name: "A", sections: [
                makeSection({
                    id: 10, groupID: 1, tasks: [
                        makeTask({ id: 100, sectionID: 10, text: "t", subtasks: [makeTask({ id: 101, sectionID: 10, taskID: 100 })] }),
                        makeTask({ id: 102, sectionID: 10, position: 1 }),
                    ],
                }),
            ],
        }),
        makeGroup({ id: 2, position: 1 }),
    ],
})

let tree: NoteDataTree | undefined
let commits: number
const store = {
    active: () => tree ? { id: 7, tree } : null,
    get: (id: number) => id === 7 ? tree : undefined,
    commit: (_id: number, next: NoteDataTree) => { tree = next; commits += 1 },
}

beforeEach(() => {
    tree = initial()
    commits = 0
})

describe("note optimistic actions", () => {
    it("patchGroup / patchSection / patchTask apply at once and roll back to the previous values", () => {
        const actions = createNoteOptimisticActions(store)

        const undoGroup = actions.patchGroup(1, { name: "B" })
        expect(tree!.groups[0].name).toBe("B")
        undoGroup()
        expect(tree!.groups[0].name).toBe("A")

        const undoSection = actions.patchSection(10, { title: "New", color: "#f00" })
        expect(tree!.groups[0].sections[0]).toMatchObject({ title: "New", color: "#f00" })
        undoSection()
        expect(tree!.groups[0].sections[0]).toMatchObject({ title: "Section 1", color: undefined })

        const undoTask = actions.patchTask(101, { completed: true })
        expect(tree!.groups[0].sections[0].tasks[0].subtasks[0].completed).toBe(true)
        undoTask()
        expect(tree!.groups[0].sections[0].tasks[0].subtasks[0].completed).toBe(false)
    })

    it("a rollback keeps the changes made to other fields in the meantime", () => {
        const actions = createNoteOptimisticActions(store)
        const undo = actions.patchTask(100, { text: "new text" })
        actions.patchTask(100, { priority: true })
        undo()
        expect(tree!.groups[0].sections[0].tasks[0]).toMatchObject({ text: "t", priority: true })
    })

    it("does nothing (and returns a harmless rollback) for an unknown item or without cached data", () => {
        const actions = createNoteOptimisticActions(store)
        const before = tree
        actions.patchTask(999, { completed: true })()
        actions.removeSection(999)()
        expect(tree).toBe(before)
        expect(commits).toBe(0)

        tree = undefined
        expect(() => actions.patchGroup(1, { name: "x" })()).not.toThrow()
    })

    it("insertGroup / insertSection / insertTask add the item and roll back by removing it", () => {
        const actions = createNoteOptimisticActions(store)

        const undoGroup = actions.insertGroup(makeGroup({ id: 3 }), 1)
        expect(tree!.groups.map(g => g.id)).toEqual([1, 3, 2])
        undoGroup()
        expect(tree!.groups.map(g => g.id)).toEqual([1, 2])

        const undoSection = actions.insertSection(2, makeSection({ id: 20, groupID: 2 }))
        expect(tree!.groups[1].sections.map(s => s.id)).toEqual([20])
        undoSection()
        expect(tree!.groups[1].sections).toEqual([])

        const undoTask = actions.insertTask({ parentTaskId: 102 }, makeTask({ id: 103, taskID: 102 }))
        expect(tree!.groups[0].sections[0].tasks[1].subtasks.map(t => t.id)).toEqual([103])
        undoTask()
        expect(tree!.groups[0].sections[0].tasks[1].subtasks).toEqual([])
    })

    it("removeGroup / removeSection / removeTask remove the item and roll back at the original place", () => {
        const actions = createNoteOptimisticActions(store)
        const original = tree

        const undoTask = actions.removeTask(100)
        expect(tree!.groups[0].sections[0].tasks.map(t => t.id)).toEqual([102])
        undoTask()
        expect(tree!.groups[0].sections[0].tasks.map(t => t.id)).toEqual([100, 102])
        expect(tree!.groups[0].sections[0].tasks[0].subtasks.map(t => t.id)).toEqual([101])

        const undoSection = actions.removeSection(10)
        expect(tree!.groups[0].sections).toEqual([])
        undoSection()
        expect(tree!.groups[0].sections.map(s => s.id)).toEqual([10])

        const undoGroup = actions.removeGroup(1)
        expect(tree!.groups.map(g => g.id)).toEqual([2])
        undoGroup()
        expect(tree).toEqual(original)
    })

    it("append* build the new item with the database defaults, at the end of its siblings", () => {
        const actions = createNoteOptimisticActions(store)

        expect(actions.appendGroup(5, 7, "  Nuovo ")).toBeTypeOf("function")
        expect(tree!.groups[2]).toMatchObject({ id: 5, noteID: 7, name: "Nuovo", position: 2, sections: [] })

        expect(actions.appendSection(6, 5, "Sez")).toBeTypeOf("function")
        expect(tree!.groups[2].sections[0]).toMatchObject({ id: 6, groupID: 5, title: "Sez", position: 0, archived: false })

        expect(actions.appendTask(8, { sectionId: 10 }, "Nuovo task")).toBeTypeOf("function")
        expect(tree!.groups[0].sections[0].tasks[2]).toMatchObject({ id: 8, sectionID: 10, taskID: null, text: "Nuovo task", position: 2 })

        // Subtasks inherit the section of their parent
        expect(actions.appendTask(9, { parentTaskId: 101 }, "Sub")).toBeTypeOf("function")
        expect(tree!.groups[0].sections[0].tasks[0].subtasks[0].subtasks[0]).toMatchObject({ id: 9, sectionID: 10, taskID: 101 })
    })

    it("append* roll back by removing the item", () => {
        const actions = createNoteOptimisticActions(store)
        const before = tree
        actions.appendTask(8, { sectionId: 10 }, "x")!()
        expect(tree!.groups[0].sections[0].tasks.map(t => t.id)).toEqual([100, 102])
        expect(tree).not.toBe(before)
    })

    it("append* return null when they cannot apply (missing id or parent)", () => {
        const actions = createNoteOptimisticActions(store)
        expect(actions.appendTask(undefined as unknown as number, { sectionId: 10 }, "x")).toBeNull()
        expect(actions.appendTask(8, { sectionId: 999 }, "x")).toBeNull()
        expect(actions.appendTask(8, { parentTaskId: 999 }, "x")).toBeNull()
        expect(actions.appendSection(6, 999, "x")).toBeNull()
        expect(commits).toBe(0)
        tree = undefined
        expect(actions.appendGroup(5, 7, "x")).toBeNull()
    })

    it("applySectionMove / applyTaskMove move the item and roll back to its origin", () => {
        const actions = createNoteOptimisticActions(store)
        const original = tree

        const undoSection = actions.applySectionMove(10, 2, 0)
        expect(tree!.groups[0].sections).toEqual([])
        expect(tree!.groups[1].sections.map(s => s.id)).toEqual([10])
        undoSection()
        expect(tree).toEqual(original)

        const undoTask = actions.applyTaskMove(102, { sectionId: 10, parentTaskId: 100 }, 1)
        expect(tree!.groups[0].sections[0].tasks[0].subtasks.map(t => t.id)).toEqual([101, 102])
        undoTask()
        expect(tree).toEqual(original)
    })

    it("applySectionMoveToNewGroup inserts the new group with the section and rolls back to the origin", () => {
        const actions = createNoteOptimisticActions(store)
        const original = tree

        const undo = actions.applySectionMoveToNewGroup(10, 9, 1)!
        expect(tree!.groups.map(g => g.id)).toEqual([1, 9, 2])
        expect(tree!.groups[1]).toMatchObject({ noteID: tree!.groups[0].noteID, position: 1, name: null })
        expect(tree!.groups[0].sections).toEqual([])
        expect(tree!.groups[1].sections.map(s => s.id)).toEqual([10])
        undo()
        expect(tree).toEqual(original)
    })

    it("applySectionMoveToNewGroup returns null when it cannot apply", () => {
        const actions = createNoteOptimisticActions(store)
        expect(actions.applySectionMoveToNewGroup(10, undefined as unknown as number, 0)).toBeNull()
        expect(actions.applySectionMoveToNewGroup(999, 9, 0)).toBeNull()
        expect(commits).toBe(0)
    })

    it("a rollback of a move of a subtask restores its parent", () => {
        const actions = createNoteOptimisticActions(store)
        const original = tree
        const undo = actions.applyTaskMove(101, { sectionId: 10, parentTaskId: null }, 2)
        expect(tree!.groups[0].sections[0].tasks.map(t => t.id)).toEqual([100, 102, 101])
        undo()
        expect(tree).toEqual(original)
    })
})
