import { describe, expect, it } from "vitest"
import { makeDefaultSection, makeGroup, makeSection, makeTask } from "@/test/ui-fixtures"
import { buildNoteTree } from "./tree-builders"

describe("buildNoteTree", () => {
    it("builds groups, sections and nested tasks in the order of the input", () => {
        const tree = buildNoteTree(
            [makeGroup({ id: 1 }), makeGroup({ id: 2, position: 1 })],
            [makeSection({ id: 10, groupID: 1 }), makeSection({ id: 11, groupID: 1, position: 1 })],
            [
                makeTask({ id: 100, sectionID: 10 }),
                makeTask({ id: 101, sectionID: 10, taskID: 100 }),
                makeTask({ id: 102, sectionID: 10, taskID: 101 }),
            ],
        )
        expect(tree.groups.map(g => g.sections.map(s => s.id))).toEqual([[10, 11], []])
        expect(tree.groups[0].sections[0].tasks[0].subtasks[0].subtasks[0].id).toBe(102)
        expect(tree.groups[0].defaultSection).toBeUndefined()
    })

    it("splits the default section into group.defaultSection, with its tasks and subtasks, out of group.sections", () => {
        const tree = buildNoteTree(
            [makeGroup({ id: 1 }), makeGroup({ id: 2, position: 1 })],
            [
                // From SQLite the flag is 0/1
                makeDefaultSection({ id: 90, groupID: 1, is_default: 1 }),
                makeSection({ id: 10, groupID: 1, is_default: 0 }),
                makeDefaultSection({ id: 91, groupID: 2 }),
            ],
            [
                makeTask({ id: 300, sectionID: 90 }),
                makeTask({ id: 301, sectionID: 90, taskID: 300 }),
                makeTask({ id: 100, sectionID: 10 }),
            ],
        )
        const [first, second] = tree.groups
        expect(first.sections.map(s => s.id)).toEqual([10])
        expect(first.defaultSection?.id).toBe(90)
        expect(first.defaultSection?.tasks.map(t => t.id)).toEqual([300])
        expect(first.defaultSection?.tasks[0].subtasks.map(t => t.id)).toEqual([301])
        expect(first.sections[0].tasks.map(t => t.id)).toEqual([100])
        // An empty group has a default section too, without tasks
        expect(second.sections).toEqual([])
        expect(second.defaultSection).toMatchObject({ id: 91, tasks: [] })
    })

    it("keeps the width of the group", () => {
        const tree = buildNoteTree([makeGroup({ id: 1, width: 420 })], [], [])
        expect(tree.groups[0].width).toBe(420)
    })
})
