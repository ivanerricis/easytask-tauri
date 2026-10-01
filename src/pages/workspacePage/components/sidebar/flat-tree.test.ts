import { describe, expect, it } from "vitest"
import type { Folder, Note } from "@/types/types"
import { flattenTree } from "./flat-tree"

const note = (id: number) => ({ id, name: `n${id}` }) as unknown as Note
const folder = (id: number, subfolders: Folder[] = [], notes: Note[] = []) =>
    ({ id, name: `f${id}`, subfolders, notes }) as unknown as Folder

const tree = {
    rootFolders: [folder(1, [folder(2, [], [note(20)])], [note(10)]), folder(3)],
    rootNotes: [note(100)],
}

describe("flattenTree", () => {
    it("lists subfolders before notes with depth", () => {
        const rows = flattenTree(tree, new Set())
        expect(rows.map(r => `${r.key}:${r.depth}`)).toEqual([
            "folder-1:0", "folder-2:1", "note-20:2", "note-10:1", "folder-3:0", "note-100:0",
        ])
    })

    it("skips the children of collapsed folders", () => {
        expect(flattenTree(tree, new Set([1])).map(r => r.key)).toEqual(["folder-1", "folder-3", "note-100"])
        const keys = flattenTree(tree, new Set([2])).map(r => r.key)
        expect(keys).toContain("note-10")
        expect(keys).not.toContain("note-20")
    })
})
