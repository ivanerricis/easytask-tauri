import { describe, expect, it } from "vitest"
import type { Folder, Note } from "@/types/types"
import { flattenTree } from "./flat-tree"
import { treeKeyAction } from "./tree-keyboard"

const note = (id: number) => ({ id, name: `n${id}` }) as unknown as Note
const folder = (id: number, subfolders: Folder[] = [], notes: Note[] = []) => ({ id, name: `f${id}`, subfolders, notes }) as unknown as Folder

// f1 (f2 (n1), n2), f3, n3        rows: f1 f2 n1 n2 f3 n3
const tree = { rootFolders: [folder(1, [folder(2, [], [note(1)])], [note(2)]), folder(3)], rootNotes: [note(3)] }
const open = new Set<number>()
const rows = flattenTree(tree, open)

describe("treeKeyAction", () => {
    it("moves down and up between the visible rows", () => {
        expect(treeKeyAction(rows, "folder-1", "ArrowDown", open)).toEqual({ type: "focus", key: "folder-2" })
        expect(treeKeyAction(rows, "note-2", "ArrowUp", open)).toEqual({ type: "focus", key: "note-1" })
    })

    it("stays on the first and the last row at the ends", () => {
        expect(treeKeyAction(rows, "folder-1", "ArrowUp", open)).toEqual({ type: "focus", key: "folder-1" })
        expect(treeKeyAction(rows, "note-3", "ArrowDown", open)).toEqual({ type: "focus", key: "note-3" })
    })

    it("jumps to the first and the last row with Home and End", () => {
        expect(treeKeyAction(rows, "note-1", "Home", open)).toEqual({ type: "focus", key: "folder-1" })
        expect(treeKeyAction(rows, "note-1", "End", open)).toEqual({ type: "focus", key: "note-3" })
    })

    it("skips the children of a collapsed folder", () => {
        const collapsed = new Set([1])
        const visible = flattenTree(tree, collapsed)
        expect(treeKeyAction(visible, "folder-1", "ArrowDown", collapsed)).toEqual({ type: "focus", key: "folder-3" })
    })

    it("opens a closed folder with Right and goes to its first child when it is open", () => {
        const collapsed = new Set([1])
        expect(treeKeyAction(flattenTree(tree, collapsed), "folder-1", "ArrowRight", collapsed)).toEqual({ type: "expand", folderId: 1 })
        expect(treeKeyAction(rows, "folder-1", "ArrowRight", open)).toEqual({ type: "focus", key: "folder-2" })
    })

    it("does nothing on Right for a note or an empty open folder", () => {
        expect(treeKeyAction(rows, "note-2", "ArrowRight", open)).toEqual({ type: "focus", key: "note-2" })
        expect(treeKeyAction(rows, "folder-3", "ArrowRight", open)).toEqual({ type: "focus", key: "folder-3" })
    })

    it("closes an open folder with Left", () => {
        expect(treeKeyAction(rows, "folder-2", "ArrowLeft", open)).toEqual({ type: "collapse", folderId: 2 })
    })

    it("goes to the parent folder with Left on a note or a closed folder", () => {
        expect(treeKeyAction(rows, "note-1", "ArrowLeft", open)).toEqual({ type: "focus", key: "folder-2" })
        expect(treeKeyAction(rows, "note-2", "ArrowLeft", open)).toEqual({ type: "focus", key: "folder-1" })
        const collapsed = new Set([2])
        expect(treeKeyAction(flattenTree(tree, collapsed), "folder-2", "ArrowLeft", collapsed)).toEqual({ type: "focus", key: "folder-1" })
    })

    it("stays put with Left on a root note", () => {
        expect(treeKeyAction(rows, "note-3", "ArrowLeft", open)).toEqual({ type: "focus", key: "note-3" })
    })

    it("ignores the other keys and rows that are not there", () => {
        expect(treeKeyAction(rows, "folder-1", "a", open)).toBeNull()
        expect(treeKeyAction(rows, "folder-1", " ", open)).toBeNull()
        expect(treeKeyAction(rows, "folder-1", "Enter", open)).toBeNull()
        expect(treeKeyAction(rows, "note-99", "ArrowDown", open)).toBeNull()
    })
})
