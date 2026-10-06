import { describe, expect, it } from "vitest"
import type { Folder, Note } from "@/types/types"
import { getMultiMoveDestinations, planMultiMove } from "./tree-multi-move"
import type { TreeRef } from "./tree-dnd"

const note = (id: number, folderID: number | null = null): Note => ({ id, name: `n${id}`, folderID, workspaceID: 1, position: 0 } as unknown as Note)
const folder = (id: number, folderID: number | null, subfolders: Folder[] = [], notes: Note[] = []): Folder =>
    ({ id, name: `f${id}`, folderID, workspaceID: 1, position: 0, subfolders, notes } as unknown as Folder)
const n = (id: number): TreeRef => ({ type: "note", id })
const f = (id: number): TreeRef => ({ type: "folder", id })

// root: f1 { f2 { n20 }, n10, n11 }, f3 { n30 }, f4, n40, n41, n42
const tree = {
    rootFolders: [
        folder(1, null, [folder(2, 1, [], [note(20, 2)])], [note(10, 1), note(11, 1)]),
        folder(3, null, [], [note(30, 3)]),
        folder(4, null),
    ],
    rootNotes: [note(40), note(41), note(42)],
}

const steps = (plan: ReturnType<typeof planMultiMove>) => plan?.map(m => `${m.type[0]}${m.id}: ${m.from.folderId}/${m.from.index} -> ${m.to.folderId}/${m.to.index}`)

describe("planMultiMove", () => {
    it("moves into a folder, appending the items in order", () => {
        expect(steps(planMultiMove(tree, [n(40), n(42), f(4)], { type: "folder", id: 3 }, "inside"))).toEqual([
            "n40: null/0 -> 3/1",
            "n42: null/1 -> 3/2",
            "f4: null/2 -> 3/0",
        ])
    })

    it("moves to the end of the root from the area below the rows", () => {
        expect(steps(planMultiMove(tree, [n(10), n(30)], null, "inside"))).toEqual([
            "n10: 1/0 -> null/3",
            "n30: 3/0 -> null/4",
        ])
    })

    it("'inside-start' puts them first, in order", () => {
        expect(steps(planMultiMove(tree, [n(40), n(41)], { type: "folder", id: 1 }, "inside-start"))).toEqual([
            "n40: null/0 -> 1/0",
            "n41: null/0 -> 1/1",
        ])
    })

    it("places them before or after a sibling of the same type, keeping the order", () => {
        // n10 is already before n11: only n41 really moves
        expect(steps(planMultiMove(tree, [n(10), n(41)], { type: "note", id: 11 }, "before"))).toEqual(["n41: null/1 -> 1/1"])
        expect(steps(planMultiMove(tree, [n(30), n(20)], { type: "note", id: 10 }, "before"))).toEqual([
            "n30: 3/0 -> 1/0",
            "n20: 2/0 -> 1/1",
        ])
    })

    it("indexes every step against the lists as they are after the previous steps", () => {
        // After n41 and nothing else follows it: n40 goes last, then n42 goes last, so the final order is n41 n40 n42
        expect(steps(planMultiMove(tree, [n(40), n(42)], { type: "note", id: 41 }, "after"))).toEqual([
            "n40: null/0 -> null/2",
            "n42: null/1 -> null/2",
        ])
    })

    it("puts notes dropped next to a folder first, and folders dropped next to a note last", () => {
        // n40 is already the first note: only the folder moves
        expect(steps(planMultiMove(tree, [n(40), f(4)], { type: "folder", id: 3 }, "before"))).toEqual(["f4: null/2 -> null/1"])
        expect(steps(planMultiMove(tree, [f(3), n(30)], { type: "note", id: 41 }, "before"))).toEqual([
            "f3: null/1 -> null/2",
            "n30: 3/0 -> null/1",
        ])
    })

    it("rejects a drop onto one of the moved items, a folder into itself or into its descendants", () => {
        expect(planMultiMove(tree, [n(40), n(41)], { type: "note", id: 41 }, "after")).toBeNull()
        expect(planMultiMove(tree, [f(1), n(40)], { type: "folder", id: 1 }, "inside")).toBeNull()
        expect(planMultiMove(tree, [f(1), n(40)], { type: "folder", id: 2 }, "inside")).toBeNull()
        expect(planMultiMove(tree, [f(1), n(40)], { type: "note", id: 20 }, "before")).toBeNull()
        // A note can go into a moved folder's descendant only when that folder is not moved too
        expect(planMultiMove(tree, [n(40)], { type: "folder", id: 2 }, "inside")).not.toBeNull()
    })

    it("returns null when nothing would change and leaves the items already in place out of the plan", () => {
        expect(planMultiMove(tree, [n(10), n(11)], { type: "folder", id: 1 }, "inside")).toBeNull()
        expect(planMultiMove(tree, [n(41), n(42)], null, "inside")).toBeNull()
        expect(steps(planMultiMove(tree, [n(11), n(40)], { type: "folder", id: 1 }, "inside"))).toEqual(["n40: null/0 -> 1/2"])
        expect(planMultiMove(tree, [], null, "inside")).toBeNull()
        expect(planMultiMove(tree, [n(999)], null, "inside")).toBeNull()
    })

    it("moves a folder next to another one with the same ordering rules as a single drop", () => {
        expect(steps(planMultiMove(tree, [f(4), f(2)], { type: "folder", id: 1 }, "before"))).toEqual([
            "f4: null/2 -> null/0",
            "f2: 1/0 -> null/1",
        ])
    })
})

describe("getMultiMoveDestinations", () => {
    it("offers the root and the folders where something would move, without the moved folders' subtrees", () => {
        expect(getMultiMoveDestinations(tree, [f(1), n(40)]).map(d => d.id)).toEqual([3, 4])
        expect(getMultiMoveDestinations(tree, [n(10), n(20)]).map(d => d.id)).toEqual([null, 1, 2, 3, 4])
    })

    it("leaves out the destinations where every item already is", () => {
        const ids = getMultiMoveDestinations(tree, [n(40), n(41)]).map(d => d.id)
        expect(ids).not.toContain(null)
        expect(ids).toEqual([1, 2, 3, 4])
        expect(getMultiMoveDestinations(tree, [n(10), n(11)]).map(d => d.id)).not.toContain(1)
    })

    it("reports the depth of every folder", () => {
        expect(getMultiMoveDestinations(tree, [n(40)]).map(d => [d.id, d.depth])).toEqual([[1, 0], [2, 1], [3, 0], [4, 0]])
    })
})
