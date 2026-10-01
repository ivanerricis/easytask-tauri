import { describe, expect, it } from "vitest"
import type { Folder, Note } from "@/types/types"
import { makeNote } from "@/test/ui-fixtures"
import { computeDropTarget, computeDropZone, getMoveDestinations, type TreeData } from "./tree-dnd"

const dates = { creation_date: "", creation_time: "", edit_date: "", edit_time: "" }
const folder = (id: number, folderID: number | null, subfolders: Folder[] = [], notes: Note[] = []): Folder => ({
    id, workspaceID: 1, folderID, name: `F${id}`, position: 0, ...dates, subfolders, notes,
})
const note = (id: number, folderID: number | null) => makeNote({ id, folderID, name: `N${id}` })

// root: F1 { F3 { N6 }, F4, N4, N5 }, F2 { }, N1, N2, N3
const tree = (): TreeData => ({
    rootFolders: [
        folder(1, null, [folder(3, 1, [], [note(6, 3)]), folder(4, 1)], [note(4, 1), note(5, 1)]),
        folder(2, null),
    ],
    rootNotes: [note(1, null), note(2, null), note(3, null)],
})

const N = (id: number) => ({ type: "note", id }) as const
const F = (id: number) => ({ type: "folder", id }) as const

describe("computeDropZone", () => {
    const rect = { top: 100, height: 28 }
    it("splits a note row in halves", () => {
        expect(computeDropZone("note", rect, 105)).toBe("before")
        expect(computeDropZone("note", rect, 120)).toBe("after")
    })
    it("uses 25% / 50% / 25% on a folder row", () => {
        expect(computeDropZone("folder", rect, 103)).toBe("before")
        expect(computeDropZone("folder", rect, 114)).toBe("inside")
        expect(computeDropZone("folder", rect, 125)).toBe("after")
    })
    it("bottom zone of an expanded folder with children means inside (first)", () => {
        expect(computeDropZone("folder", rect, 125, { expandedWithChildren: true })).toBe("inside-start")
    })
})

describe("computeDropTarget notes", () => {
    it("reorders within the same parent using the final index (move down)", () => {
        // N1 after N3: list without N1 = [N2, N3] -> index 2
        expect(computeDropTarget(tree(), N(1), N(3), "after")).toEqual({ folderId: null, index: 2 })
        expect(computeDropTarget(tree(), N(1), N(2), "after")).toEqual({ folderId: null, index: 1 })
    })
    it("reorders within the same parent (move up)", () => {
        expect(computeDropTarget(tree(), N(3), N(1), "before")).toEqual({ folderId: null, index: 0 })
        expect(computeDropTarget(tree(), N(3), N(2), "before")).toEqual({ folderId: null, index: 1 })
    })
    it("returns null when nothing would change", () => {
        expect(computeDropTarget(tree(), N(2), N(3), "before")).toBeNull()
        expect(computeDropTarget(tree(), N(2), N(1), "after")).toBeNull()
        expect(computeDropTarget(tree(), N(2), N(2), "after")).toBeNull()
    })
    it("moves between parents before/after a note", () => {
        expect(computeDropTarget(tree(), N(1), N(4), "before")).toEqual({ folderId: 1, index: 0 })
        expect(computeDropTarget(tree(), N(1), N(4), "after")).toEqual({ folderId: 1, index: 1 })
        expect(computeDropTarget(tree(), N(1), N(5), "after")).toEqual({ folderId: 1, index: 2 })
    })
    it("drops inside a folder at the end, or first with inside-start", () => {
        expect(computeDropTarget(tree(), N(1), F(1), "inside")).toEqual({ folderId: 1, index: 2 })
        expect(computeDropTarget(tree(), N(1), F(1), "inside-start")).toEqual({ folderId: 1, index: 0 })
        expect(computeDropTarget(tree(), N(1), F(2), "inside")).toEqual({ folderId: 2, index: 0 })
    })
    it("places a note dropped next to a folder as the first note of that parent", () => {
        expect(computeDropTarget(tree(), N(2), F(2), "before")).toEqual({ folderId: null, index: 0 })
        expect(computeDropTarget(tree(), N(6), F(1), "after")).toEqual({ folderId: null, index: 0 })
        expect(computeDropTarget(tree(), N(1), F(4), "before")).toEqual({ folderId: 1, index: 0 })
    })
    it("moves a note to the end of the root from the empty area", () => {
        expect(computeDropTarget(tree(), N(4), null, "inside")).toEqual({ folderId: null, index: 3 })
        expect(computeDropTarget(tree(), N(3), null, "inside")).toBeNull()
    })
    it("does not move a note out of a folder into the same place", () => {
        expect(computeDropTarget(tree(), N(5), F(1), "inside")).toBeNull()
    })
})

describe("computeDropTarget folders", () => {
    it("reorders folders in the same parent", () => {
        expect(computeDropTarget(tree(), F(1), F(2), "after")).toEqual({ folderId: null, index: 1 })
        expect(computeDropTarget(tree(), F(2), F(1), "before")).toEqual({ folderId: null, index: 0 })
        expect(computeDropTarget(tree(), F(1), F(2), "before")).toBeNull()
    })
    it("nests a folder inside another at the end", () => {
        expect(computeDropTarget(tree(), F(2), F(1), "inside")).toEqual({ folderId: 1, index: 2 })
        expect(computeDropTarget(tree(), F(2), F(1), "inside-start")).toEqual({ folderId: 1, index: 0 })
    })
    it("puts a folder dropped next to a note after the last folder of that parent", () => {
        expect(computeDropTarget(tree(), F(2), N(4), "before")).toEqual({ folderId: 1, index: 2 })
        expect(computeDropTarget(tree(), F(2), N(1), "after")).toBeNull() // already last folder of the root
        expect(computeDropTarget(tree(), F(1), N(1), "before")).toEqual({ folderId: null, index: 1 })
    })
    it("moves a subfolder to the root from the empty area", () => {
        expect(computeDropTarget(tree(), F(3), null, "inside")).toEqual({ folderId: null, index: 2 })
    })
    it("rejects dropping a folder into itself or a descendant", () => {
        expect(computeDropTarget(tree(), F(1), F(1), "inside")).toBeNull()
        expect(computeDropTarget(tree(), F(1), F(3), "inside")).toBeNull()
        expect(computeDropTarget(tree(), F(1), F(3), "before")).toBeNull()
        expect(computeDropTarget(tree(), F(1), N(6), "after")).toBeNull()
    })
})

describe("getMoveDestinations", () => {
    it("lists root and folders with depth, excluding the current parent", () => {
        expect(getMoveDestinations(tree(), { ...N(4), folderID: 1 })).toEqual([
            { id: null, name: null, depth: 0 },
            { id: 3, name: "F3", depth: 1 },
            { id: 4, name: "F4", depth: 1 },
            { id: 2, name: "F2", depth: 0 },
        ])
    })
    it("omits root for root items", () => {
        expect(getMoveDestinations(tree(), { ...N(1), folderID: null }).map(d => d.id)).toEqual([1, 3, 4, 2])
    })
    it("excludes a folder, its descendants and its parent", () => {
        expect(getMoveDestinations(tree(), { ...F(1), folderID: null }).map(d => d.id)).toEqual([2])
        expect(getMoveDestinations(tree(), { ...F(3), folderID: 1 }).map(d => d.id)).toEqual([null, 4, 2])
    })
})
