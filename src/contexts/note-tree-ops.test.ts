import { describe, expect, it } from "vitest"
import type { NoteDataTree } from "@/types/types"
import { makeGroup, makeSection, makeTask } from "@/test/ui-fixtures"
import {
    buildGroup, buildSection, buildTask, findGroup, findSection, findTask,
    insertGroup, insertSection, insertTask, localTimestamp, moveSection, moveTask,
    nextPosition, patchGroup, patchSection, patchTask, removeGroup, removeSection, removeTask,
} from "./note-tree-ops"

const sample = (): NoteDataTree => ({
    groups: [
        makeGroup({
            id: 1, position: 0, name: "A", sections: [
                makeSection({
                    id: 10, groupID: 1, title: "S10", tasks: [
                        makeTask({ id: 100, sectionID: 10, position: 0, subtasks: [makeTask({ id: 101, sectionID: 10, taskID: 100 })] }),
                        makeTask({ id: 102, sectionID: 10, position: 1 }),
                    ],
                }),
                makeSection({ id: 11, groupID: 1, title: "S11", position: 1 }),
            ],
        }),
        makeGroup({ id: 2, position: 1, sections: [makeSection({ id: 20, groupID: 2, title: "S20", tasks: [makeTask({ id: 200, sectionID: 20 })] })] }),
    ],
})

describe("lookups", () => {
    it("finds groups, sections and tasks at any depth with their location", () => {
        const tree = sample()
        expect(findGroup(tree, 2)).toMatchObject({ index: 1 })
        expect(findSection(tree, 11)).toMatchObject({ groupId: 1, index: 1 })
        expect(findTask(tree, 101)).toMatchObject({ parent: { parentTaskId: 100 }, index: 0 })
        expect(findTask(tree, 102)).toMatchObject({ parent: { sectionId: 10 }, index: 1 })
        expect(findGroup(tree, 9)).toBeUndefined()
        expect(findSection(tree, 9)).toBeUndefined()
        expect(findTask(tree, 9)).toBeUndefined()
    })
})

describe("patch", () => {
    it("patches a group without touching the others (structural sharing)", () => {
        const tree = sample()
        const next = patchGroup(tree, 1, { name: "B" })
        expect(next.groups[0].name).toBe("B")
        expect(next.groups[0].sections).toBe(tree.groups[0].sections)
        expect(next.groups[1]).toBe(tree.groups[1])
        expect(tree.groups[0].name).toBe("A")
    })

    it("patches a section", () => {
        const tree = sample()
        const next = patchSection(tree, 20, { title: "New", color: "#fff" })
        expect(next.groups[1].sections[0]).toMatchObject({ title: "New", color: "#fff" })
        expect(next.groups[0]).toBe(tree.groups[0])
    })

    it("patches a task at any depth", () => {
        const tree = sample()
        const next = patchTask(tree, 101, { completed: true })
        expect(next.groups[0].sections[0].tasks[0].subtasks[0].completed).toBe(true)
        expect(next.groups[0].sections[0].tasks[1]).toBe(tree.groups[0].sections[0].tasks[1])
        expect(next.groups[1]).toBe(tree.groups[1])
    })

    it("returns the same tree for an unknown id", () => {
        const tree = sample()
        expect(patchGroup(tree, 9, { name: "x" })).toBe(tree)
        expect(patchSection(tree, 9, { title: "x" })).toBe(tree)
        expect(patchTask(tree, 9, { text: "x" })).toBe(tree)
    })
})

describe("insert", () => {
    it("inserts a group at the end by default and at a given index (clamped)", () => {
        const tree = sample()
        expect(insertGroup(tree, makeGroup({ id: 3 })).groups.map(g => g.id)).toEqual([1, 2, 3])
        expect(insertGroup(tree, makeGroup({ id: 3 }), 0).groups.map(g => g.id)).toEqual([3, 1, 2])
        expect(insertGroup(tree, makeGroup({ id: 3 }), 99).groups.map(g => g.id)).toEqual([1, 2, 3])
        expect(tree.groups).toHaveLength(2)
    })

    it("does not insert a group twice", () => {
        const tree = sample()
        expect(insertGroup(tree, makeGroup({ id: 1 }))).toBe(tree)
    })

    it("inserts a section in a group", () => {
        const tree = sample()
        const next = insertSection(tree, 2, makeSection({ id: 21, groupID: 2 }))
        expect(next.groups[1].sections.map(s => s.id)).toEqual([20, 21])
        expect(next.groups[0]).toBe(tree.groups[0])
        expect(insertSection(tree, 1, makeSection({ id: 21, groupID: 1 }), 0).groups[0].sections.map(s => s.id)).toEqual([21, 10, 11])
    })

    it("returns the same tree for an unknown group or a duplicated section", () => {
        const tree = sample()
        expect(insertSection(tree, 9, makeSection({ id: 21 }))).toBe(tree)
        expect(insertSection(tree, 1, makeSection({ id: 10 }))).toBe(tree)
    })

    it("inserts a task at the top level of a section", () => {
        const tree = sample()
        const next = insertTask(tree, { sectionId: 11 }, makeTask({ id: 110, sectionID: 11 }))
        expect(next.groups[0].sections[1].tasks.map(t => t.id)).toEqual([110])
        expect(insertTask(tree, { sectionId: 10 }, makeTask({ id: 110 }), 1).groups[0].sections[0].tasks.map(t => t.id)).toEqual([100, 110, 102])
    })

    it("inserts a subtask under a task at any depth", () => {
        const tree = sample()
        const next = insertTask(tree, { parentTaskId: 101 }, makeTask({ id: 103, taskID: 101 }))
        expect(next.groups[0].sections[0].tasks[0].subtasks[0].subtasks.map(t => t.id)).toEqual([103])
        expect(next.groups[1]).toBe(tree.groups[1])
    })

    it("returns the same tree for an unknown parent or a duplicated task", () => {
        const tree = sample()
        expect(insertTask(tree, { sectionId: 99 }, makeTask({ id: 500 }))).toBe(tree)
        expect(insertTask(tree, { parentTaskId: 99 }, makeTask({ id: 500 }))).toBe(tree)
        expect(insertTask(tree, { sectionId: 10 }, makeTask({ id: 100 }))).toBe(tree)
    })
})

describe("remove", () => {
    it("removes a group with its content", () => {
        const tree = sample()
        expect(removeGroup(tree, 1).groups.map(g => g.id)).toEqual([2])
        expect(removeGroup(tree, 9)).toBe(tree)
    })

    it("removes a section", () => {
        const tree = sample()
        const next = removeSection(tree, 10)
        expect(next.groups[0].sections.map(s => s.id)).toEqual([11])
        expect(next.groups[1]).toBe(tree.groups[1])
        expect(removeSection(tree, 9)).toBe(tree)
    })

    it("removes a task with its subtasks, at any depth", () => {
        const tree = sample()
        expect(removeTask(tree, 100).groups[0].sections[0].tasks.map(t => t.id)).toEqual([102])
        expect(removeTask(tree, 101).groups[0].sections[0].tasks[0].subtasks).toEqual([])
        expect(removeTask(tree, 9)).toBe(tree)
    })
})

describe("move", () => {
    it("moves a section to another group at an index and updates its groupID", () => {
        const tree = sample()
        const next = moveSection(tree, 10, 2, 0)
        expect(next.groups[0].sections.map(s => s.id)).toEqual([11])
        expect(next.groups[1].sections.map(s => s.id)).toEqual([10, 20])
        expect(next.groups[1].sections[0].groupID).toBe(2)
        expect(next.groups[1].sections[0].tasks).toHaveLength(2)
    })

    it("moves a section inside its group (the index counts the siblings without it)", () => {
        const tree = sample()
        expect(moveSection(tree, 10, 1, 1).groups[0].sections.map(s => s.id)).toEqual([11, 10])
    })

    it("keeps an emptied source group", () => {
        const tree = sample()
        expect(moveSection(tree, 20, 1, 0).groups.map(g => g.id)).toEqual([1, 2])
    })

    it("is a no-op for unknown ids", () => {
        const tree = sample()
        expect(moveSection(tree, 99, 1, 0)).toBe(tree)
        expect(moveSection(tree, 10, 99, 0)).toBe(tree)
    })

    it("moves a task (with its subtree) to another section and updates the section of the whole subtree", () => {
        const tree = sample()
        const next = moveTask(tree, 100, { sectionId: 20, parentTaskId: null }, 0)
        expect(next.groups[0].sections[0].tasks.map(t => t.id)).toEqual([102])
        const moved = next.groups[1].sections[0].tasks[0]
        expect(moved).toMatchObject({ id: 100, sectionID: 20, taskID: null })
        expect(moved.subtasks[0]).toMatchObject({ id: 101, sectionID: 20, taskID: 100 })
    })

    it("moves a task under another task", () => {
        const tree = sample()
        const next = moveTask(tree, 102, { sectionId: 10, parentTaskId: 100 }, 1)
        expect(next.groups[0].sections[0].tasks.map(t => t.id)).toEqual([100])
        expect(next.groups[0].sections[0].tasks[0].subtasks.map(t => t.id)).toEqual([101, 102])
        expect(next.groups[0].sections[0].tasks[0].subtasks[1]).toMatchObject({ taskID: 100, sectionID: 10 })
    })

    it("does not move a task into its own subtree, nor an unknown task", () => {
        const tree = sample()
        expect(moveTask(tree, 100, { sectionId: 10, parentTaskId: 101 }, 0)).toBe(tree)
        expect(moveTask(tree, 99, { sectionId: 10, parentTaskId: null }, 0)).toBe(tree)
        expect(moveTask(tree, 100, { sectionId: 99, parentTaskId: null }, 0)).toBe(tree)
    })
})

describe("builders", () => {
    it("formats the local date and time like the database defaults", () => {
        expect(localTimestamp(new Date(2026, 0, 5, 7, 3))).toEqual({ date: "2026-01-05", time: "07:03" })
    })

    it("computes the next position after the siblings", () => {
        expect(nextPosition([])).toBe(0)
        expect(nextPosition([{ position: 0 }, { position: 4 }, { position: 2 }])).toBe(5)
    })

    it("builds a group, a section and a task with the database defaults", () => {
        const group = buildGroup(5, 1, "  Idee ", [makeGroup({ position: 3 })])
        expect(group).toMatchObject({ id: 5, noteID: 1, position: 4, name: "Idee", sections: [] })
        expect(buildGroup(6, 1, "  ", []).name).toBeNull()

        const section = buildSection(7, 5, "Titolo", [])
        expect(section).toMatchObject({ id: 7, groupID: 5, title: "Titolo", position: 0, archived: false, color: null, tasks: [] })
        expect(section.creation_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        expect(section.creation_time).toMatch(/^\d{2}:\d{2}$/)

        const task = buildTask(8, 7, 3, "Testo", [makeTask({ position: 1 })])
        expect(task).toMatchObject({
            id: 8, sectionID: 7, taskID: 3, position: 2, text: "Testo",
            completed: false, archived: false, priority: false, description: "", color: null, subtasks: [],
        })
    })
})
