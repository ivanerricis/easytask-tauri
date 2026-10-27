import { describe, expect, it } from "vitest"
import { makeGroup, makeSection, makeTask } from "@/test/ui-fixtures"
import type { NoteDataTree } from "@/types/types"
import { flattenVisibleTasks, getSelectedTasks, getTaskDestinations, getTopMostTasks, parseTaskKey, taskKey } from "./task-selection"

// Gruppo 1 (position 0): direct tasks 1, 2 (with subtask 21); section 10 "A": 3, 4 (done) ; section 11 "B": 5
// Gruppo 2 (position 1, listed first in the array): section 12: 6
const tree: NoteDataTree = {
    groups: [
        makeGroup({
            id: 2, position: 1, name: "Altro",
            sections: [makeSection({ id: 12, groupID: 2, title: "C", tasks: [makeTask({ id: 6, sectionID: 12 })] })],
        }),
        makeGroup({
            id: 1, position: 0,
            defaultSection: makeSection({
                id: 99, groupID: 1, title: "", is_default: true,
                tasks: [makeTask({ id: 1, sectionID: 99 }), makeTask({ id: 2, sectionID: 99, subtasks: [makeTask({ id: 21, sectionID: 99, taskID: 2 })] })],
            }),
            sections: [
                makeSection({ id: 10, groupID: 1, title: "A", tasks: [makeTask({ id: 3, sectionID: 10 }), makeTask({ id: 4, sectionID: 10, completed: true })] }),
                makeSection({ id: 11, groupID: 1, title: "B", tasks: [makeTask({ id: 5, sectionID: 11 })] }),
            ],
        }),
    ],
}

const all = { hideCompleted: false, isGroupOpen: () => true, isSectionOpen: () => true }
const ids = (list: { id: number }[]) => list.map(task => task.id)

describe("keys", () => {
    it("builds and parses the key of a task", () => {
        expect(taskKey(12)).toBe("task-12")
        expect(parseTaskKey("task-12")).toBe(12)
        expect(parseTaskKey("note-12")).toBeNull()
        expect(parseTaskKey("task-x")).toBeNull()
    })
})

describe("flattenVisibleTasks", () => {
    it("follows the screen: groups by position, direct tasks first, then the sections, subtasks after their parent", () => {
        expect(ids(flattenVisibleTasks(tree, all))).toEqual([1, 2, 21, 3, 4, 5, 6])
    })

    it("leaves out the fully completed tasks when they are hidden", () => {
        expect(ids(flattenVisibleTasks(tree, { ...all, hideCompleted: true }))).toEqual([1, 2, 21, 3, 5, 6])
    })

    it("leaves out closed groups and closed sections, but never closes the direct tasks of an open group", () => {
        expect(ids(flattenVisibleTasks(tree, { ...all, isGroupOpen: id => id !== 2 }))).toEqual([1, 2, 21, 3, 4, 5])
        expect(ids(flattenVisibleTasks(tree, { ...all, isSectionOpen: () => false }))).toEqual([1, 2, 21])
        expect(ids(flattenVisibleTasks(tree, { ...all, isSectionOpen: id => id === 11 }))).toEqual([1, 2, 21, 5])
    })
})

describe("getTopMostTasks", () => {
    it("drops a selected task whose ancestor is selected too", () => {
        expect(ids(getTopMostTasks(tree, [21, 2, 3]))).toEqual([2, 3])
        expect(ids(getTopMostTasks(tree, [21, 3]))).toEqual([21, 3])
    })

    it("returns the tasks in tree order and ignores unknown ids", () => {
        expect(ids(getTopMostTasks(tree, [6, 99999, 1]))).toEqual([1, 6])
    })

    it("getSelectedTasks keeps the subtasks of a selected task", () => {
        expect(ids(getSelectedTasks(tree, [21, 2, 7]))).toEqual([2, 21])
    })
})

describe("getTaskDestinations", () => {
    it("lists the direct area of the groups that have one and every section, group by group", () => {
        const destinations = getTaskDestinations(tree)
        expect(destinations.map(d => [d.sectionId, d.direct, d.label, d.groupLabel])).toEqual([
            [99, true, "Task diretti", "Gruppo 1"],
            [10, false, "A", "Gruppo 1"],
            [11, false, "B", "Gruppo 1"],
            [12, false, "C", "Altro"],
        ])
    })
})
