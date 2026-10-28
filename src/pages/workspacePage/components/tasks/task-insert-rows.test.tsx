import { describe, expect, it } from "vitest"
import { makeTask } from "@/test/ui-fixtures"
import { orderedVisibleTasks } from "../section/hide-completed"
import { insertAnchors } from "./task-insert-rows"

const t = (id: number, completed = false) => makeTask({ id, completed })

describe("insertAnchors", () => {
    it("anchors the first line before the first visible task and the others after the task above", () => {
        const all = [t(1), t(2), t(3)]
        expect(insertAnchors(all, all)).toEqual([null, 1, 2])
        expect(insertAnchors(all, [all[1], all[2]])).toEqual([1, 2])
    })

    it("with the completed tasks last, keeps the line above the first completed task (after the last open one)", () => {
        const all = [t(1, true), t(2), t(3, true), t(4)]
        const visible = orderedVisibleTasks(all, { hideCompleted: false, completedLast: true })
        expect(visible.map(task => task.id)).toEqual([2, 4, 1, 3])
        // The first line goes before task 2 (after task 1 in the stored list); the one above task 1 follows the last open task (4)
        expect(insertAnchors(all, visible, true)).toEqual([1, 2, 4, undefined])
    })

    it("with the completed tasks last, has no line between completed tasks", () => {
        const all = [t(1, true), t(2, true), t(3, true)]
        expect(insertAnchors(all, all, true)).toEqual([null, undefined, undefined])
    })

    it("lines between completed tasks stay when the preference is off", () => {
        const all = [t(1, true), t(2, true)]
        expect(insertAnchors(all, all)).toEqual([null, 1])
    })
})