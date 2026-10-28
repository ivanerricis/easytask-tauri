import { beforeEach, describe, expect, it } from "vitest"
import type { NoteDataTree } from "@/types/types"
import { makeDefaultSection, makeGroup, makeSection, makeTask } from "@/test/ui-fixtures"
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

        expect(actions.appendGroup(5, 7, "  Nuovo ", 50)).toBeTypeOf("function")
        expect(tree!.groups[2]).toMatchObject({ id: 5, noteID: 7, name: "Nuovo", position: 2, sections: [] })
        // The group comes with its hidden default section (the direct tasks)
        expect(tree!.groups[2].defaultSection).toMatchObject({ id: 50, groupID: 5, is_default: true, position: 0, tasks: [] })

        expect(actions.appendSection(6, 5, "Sez")).toBeTypeOf("function")
        // numbered after the default section (position 0), which shares the order of the sections
        expect(tree!.groups[2].sections[0]).toMatchObject({ id: 6, groupID: 5, title: "Sez", position: 1 })

        expect(actions.appendTask(8, { sectionId: 10 }, "Nuovo task")).toBeTypeOf("function")
        expect(tree!.groups[0].sections[0].tasks[2]).toMatchObject({ id: 8, sectionID: 10, taskID: null, text: "Nuovo task", position: 2 })

        // Subtasks inherit the section of their parent
        expect(actions.appendTask(9, { parentTaskId: 101 }, "Sub")).toBeTypeOf("function")
        expect(tree!.groups[0].sections[0].tasks[0].subtasks[0].subtasks[0]).toMatchObject({ id: 9, sectionID: 10, taskID: 101 })
    })

    it("appendTask puts the task at the given index among all the siblings", () => {
        const actions = createNoteOptimisticActions(store)
        actions.appendTask(8, { sectionId: 10 }, "In mezzo", 1)
        expect(tree!.groups[0].sections[0].tasks.map(t => t.id)).toEqual([100, 8, 102])
        actions.appendTask(9, { sectionId: 10 }, "In cima", 0)
        expect(tree!.groups[0].sections[0].tasks.map(t => t.id)).toEqual([9, 100, 8, 102])
        actions.appendTask(7, { parentTaskId: 101 }, "Sub", 0)
        expect(tree!.groups[0].sections[0].tasks[1].subtasks[0].subtasks[0]).toMatchObject({ id: 7, taskID: 101 })
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
        expect(actions.appendGroup(5, 7, "x", 50)).toBeNull()
        tree = initial()
        expect(actions.appendGroup(5, 7, "x", undefined as unknown as number)).toBeNull()
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

        const undo = actions.applySectionMoveToNewGroup(10, 9, 1, 90)!
        expect(tree!.groups.map(g => g.id)).toEqual([1, 9, 2])
        expect(tree!.groups[1].defaultSection).toMatchObject({ id: 90, groupID: 9, is_default: true })
        expect(tree!.groups[1]).toMatchObject({ noteID: tree!.groups[0].noteID, position: 1, name: null })
        expect(tree!.groups[0].sections).toEqual([])
        expect(tree!.groups[1].sections.map(s => s.id)).toEqual([10])
        undo()
        expect(tree).toEqual(original)
    })

    it("applySectionMoveToNewGroup returns null when it cannot apply", () => {
        const actions = createNoteOptimisticActions(store)
        expect(actions.applySectionMoveToNewGroup(10, undefined as unknown as number, 0, 90)).toBeNull()
        expect(actions.applySectionMoveToNewGroup(10, 9, 0, undefined as unknown as number)).toBeNull()
        expect(actions.applySectionMoveToNewGroup(999, 9, 0, 90)).toBeNull()
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

describe("note optimistic actions on the direct area of a group", () => {
    beforeEach(() => {
        tree = initial()
        tree.groups[1] = makeGroup({ id: 2, position: 1, defaultSection: makeDefaultSection({ id: 91, groupID: 2 }) })
        commits = 0
    })

    it("appendTask adds a direct task to the default section and rolls back", () => {
        const actions = createNoteOptimisticActions(store)
        const undo = actions.appendTask(300, { sectionId: 91 }, "Direct")!
        expect(tree!.groups[1].defaultSection!.tasks[0]).toMatchObject({ id: 300, sectionID: 91, taskID: null, text: "Direct", position: 0 })
        expect(actions.appendTask(301, { parentTaskId: 300 }, "Sub")).toBeTypeOf("function")
        expect(tree!.groups[1].defaultSection!.tasks[0].subtasks[0]).toMatchObject({ id: 301, sectionID: 91, taskID: 300 })
        undo()
        expect(tree!.groups[1].defaultSection!.tasks).toEqual([])
    })

    it("applyTaskMove moves a task between a section and the direct area, and undoes it", () => {
        const actions = createNoteOptimisticActions(store)
        const original = tree
        const undo = actions.applyTaskMove(102, { sectionId: 91, parentTaskId: null }, 0)
        expect(tree!.groups[1].defaultSection!.tasks[0]).toMatchObject({ id: 102, sectionID: 91 })
        expect(tree!.groups[0].sections[0].tasks.map(t => t.id)).toEqual([100])
        undo()
        expect(tree).toEqual(original)
    })

    it("patchSection patches the default section and removeSection refuses it", () => {
        const actions = createNoteOptimisticActions(store)
        actions.patchSection(91, { color: "#abc" })
        expect(tree!.groups[1].defaultSection!.color).toBe("#abc")
        const before = tree
        actions.removeSection(91)
        expect(tree).toBe(before)
    })
})

describe("note optimistic actions with the list of the direct tasks among the sections", () => {
    // group 1: [S10, (list 90), S11, S12] (defaultIndex 1); group 2: [(list 91), S20] (defaultIndex 0)
    const withList = (): NoteDataTree => ({
        groups: [
            makeGroup({
                id: 1, defaultIndex: 1, defaultSection: makeDefaultSection({ id: 90, groupID: 1 }),
                sections: [10, 11, 12].map(id => makeSection({ id, groupID: 1 })),
            }),
            makeGroup({
                id: 2, position: 1, defaultIndex: 0, defaultSection: makeDefaultSection({ id: 91, groupID: 2 }),
                sections: [makeSection({ id: 20, groupID: 2 })],
            }),
        ],
    })
    const listIndexes = () => tree!.groups.map(g => g.defaultIndex)
    const ids = (g: number) => tree!.groups[g].sections.map(s => s.id)

    beforeEach(() => {
        tree = withList()
        commits = 0
    })

    it("applyDirectSectionMove moves the list and rolls back", () => {
        const actions = createNoteOptimisticActions(store)
        const original = tree
        const undo = actions.applyDirectSectionMove(1, 3)
        expect(listIndexes()).toEqual([3, 0])
        expect(ids(0)).toEqual([10, 11, 12])
        undo()
        expect(tree).toEqual(original)
        // clamped, and nothing happens when it already is there or the group has no list
        actions.applyDirectSectionMove(1, 99)
        expect(listIndexes()).toEqual([3, 0])
        const before = commits
        actions.applyDirectSectionMove(1, 3)
        actions.applyDirectSectionMove(99, 0)
        expect(commits).toBe(before)
    })

    it("a section moved inside the group keeps the list between the same neighbours, or is dropped after it", () => {
        const actions = createNoteOptimisticActions(store)
        const original = tree
        // S10 (before the list) to the end: the list now has no section before it... [(list), S11, S12, S10] -> after all the rows
        const undo = actions.applySectionMove(10, 1, 2)
        expect(ids(0)).toEqual([11, 12, 10])
        expect(listIndexes()[0]).toBe(0)
        undo()
        expect(tree).toEqual(original)

        // S12 (after the list) to the front: it goes before the list
        const undo2 = actions.applySectionMove(12, 1, 0)
        expect(ids(0)).toEqual([12, 10, 11])
        expect(listIndexes()[0]).toBe(2)
        undo2()
        expect(tree).toEqual(original)

        // S12 to index 1: exactly where the list is (after S10): it goes after the list
        actions.applySectionMove(12, 1, 1)
        expect(ids(0)).toEqual([10, 12, 11])
        expect(listIndexes()[0]).toBe(1)
    })

    it("a section moved to another group changes the indexes of both lists, and the rollback restores them", () => {
        const actions = createNoteOptimisticActions(store)
        const original = tree
        // S10 (before the list of group 1) into group 2, exactly where its list is: it goes after that list
        const undo = actions.applySectionMove(10, 2, 0)
        expect(ids(0)).toEqual([11, 12])
        expect(ids(1)).toEqual([10, 20])
        expect(listIndexes()).toEqual([0, 0])
        undo()
        expect(tree).toEqual(original)

        // with the list of group 2 after S20, S12 (after the list of group 1) goes before it
        actions.applyDirectSectionMove(2, 1)
        const undo2 = actions.applySectionMove(12, 2, 0)
        expect(ids(1)).toEqual([12, 20])
        expect(listIndexes()).toEqual([1, 2])
        undo2()
        expect(listIndexes()).toEqual([1, 1])
    })

    it("the rollback of a removed section restores the list index even when the section stood just before it", () => {
        const actions = createNoteOptimisticActions(store)
        const original = tree
        const undo = actions.removeSection(10)
        expect(listIndexes()[0]).toBe(0)
        undo()
        expect(tree).toEqual(original)
    })

    it("applySectionMoveToNewGroup leaves the list of the source where it was among the rest and gives the new group defaultIndex 0", () => {
        const actions = createNoteOptimisticActions(store)
        const original = tree
        const undo = actions.applySectionMoveToNewGroup(10, 9, 1, 95)!
        expect(listIndexes()).toEqual([0, 0, 0])
        expect(ids(1)).toEqual([10])
        undo()
        expect(tree).toEqual(original)
    })

    it("appendSection numbers the new section after every row, the list included, and the list keeps its index", () => {
        const actions = createNoteOptimisticActions(store)
        tree!.groups[0].sections.forEach((s, i) => { s.position = i < 1 ? i : i + 1 })
        tree!.groups[0].defaultSection!.position = 1
        actions.appendSection(30, 1, "New")
        expect(tree!.groups[0].sections.at(-1)).toMatchObject({ id: 30, position: 4 })
        expect(listIndexes()[0]).toBe(1)
    })
})