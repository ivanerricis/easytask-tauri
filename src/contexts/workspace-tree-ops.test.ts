import { describe, expect, it } from "vitest"
import type { Folder, WorkspaceDataTree } from "@/types/types"
import { makeNote } from "@/test/ui-fixtures"
import {
    buildFolder, buildNote, colorFolderContent, findTreeItem, flattenTree, getFolderNotes, getSubfolders,
    insertTreeItem, patchFolder, patchNote, patchTreeItem, removeTreeItem,
} from "./workspace-tree-ops"

const makeFolder = (over: Partial<Folder>): Folder => ({
    id: 1, workspaceID: 1, folderID: null, name: "F", position: 0,
    creation_date: "2026-01-01", creation_time: "10:00", edit_date: "2026-01-01", edit_time: "10:00",
    subfolders: [], notes: [], ...over,
})

/** root folders 1 (notes 10; subfolder 2 with note 20) and 3, root note 30. */
const sample = (): WorkspaceDataTree => {
    const sub = makeFolder({ id: 2, folderID: 1, notes: [makeNote({ id: 20, folderID: 2 })] })
    return {
        rootFolders: [
            makeFolder({ id: 1, position: 0, subfolders: [sub], notes: [makeNote({ id: 10, folderID: 1 })] }),
            makeFolder({ id: 3, position: 1 }),
        ],
        rootNotes: [makeNote({ id: 30 })],
    }
}

describe("lookups", () => {
    it("finds folders and notes with parent and index", () => {
        const tree = sample()
        expect(findTreeItem(tree, "folder", 3)).toMatchObject({ parentId: null, index: 1 })
        expect(findTreeItem(tree, "folder", 2)).toMatchObject({ parentId: 1, index: 0 })
        expect(findTreeItem(tree, "note", 20)).toMatchObject({ parentId: 2, index: 0 })
        expect(findTreeItem(tree, "note", 30)).toMatchObject({ parentId: null, index: 0 })
        expect(findTreeItem(tree, "note", 3)).toBeUndefined() // ids are per type
        expect(findTreeItem(tree, "folder", 99)).toBeUndefined()
    })

    it("returns the siblings of a new item", () => {
        const tree = sample()
        expect(getSubfolders(tree, null).map(f => f.id)).toEqual([1, 3])
        expect(getSubfolders(tree, 1).map(f => f.id)).toEqual([2])
        expect(getFolderNotes(tree, null).map(n => n.id)).toEqual([30])
        expect(getFolderNotes(tree, 2).map(n => n.id)).toEqual([20])
        expect(getFolderNotes(tree, 99)).toEqual([])
    })

    it("flattens the tree", () => {
        const { folders, notes } = flattenTree(sample())
        expect(folders.map(f => f.id)).toEqual([1, 2, 3])
        expect(notes.map(n => n.id).sort()).toEqual([10, 20, 30])
    })
})

describe("patch", () => {
    it("patches a nested folder and shares the untouched branches", () => {
        const tree = sample()
        const next = patchFolder(tree, 2, { name: "Renamed" })
        expect(next.rootFolders[0].subfolders[0].name).toBe("Renamed")
        expect(next.rootFolders[1]).toBe(tree.rootFolders[1])
        expect(next.rootNotes).toBe(tree.rootNotes)
        expect(tree.rootFolders[0].subfolders[0].name).toBe("F")
    })

    it("patches a root note and a nested note", () => {
        const tree = sample()
        expect(patchNote(tree, 30, { name: "R" }).rootNotes[0].name).toBe("R")
        const next = patchNote(tree, 20, { color: "#fff" })
        expect(next.rootFolders[0].subfolders[0].notes[0].color).toBe("#fff")
        expect(next.rootFolders[1]).toBe(tree.rootFolders[1])
    })

    it("dispatches on the item type and ignores unknown ids", () => {
        const tree = sample()
        expect(patchTreeItem(tree, "folder", 3, { name: "X" }).rootFolders[1].name).toBe("X")
        expect(patchTreeItem(tree, "note", 10, { name: "X" }).rootFolders[0].notes[0].name).toBe("X")
        expect(patchTreeItem(tree, "folder", 99, { name: "X" })).toBe(tree)
        expect(patchTreeItem(tree, "note", 99, { name: "X" })).toBe(tree)
    })
})

describe("insert", () => {
    it("inserts at the workspace root", () => {
        const tree = sample()
        const folder = makeFolder({ id: 4 })
        expect(insertTreeItem(tree, "folder", folder, null).rootFolders.map(f => f.id)).toEqual([1, 3, 4])
        expect(insertTreeItem(tree, "folder", folder, null, 0).rootFolders.map(f => f.id)).toEqual([4, 1, 3])
        expect(insertTreeItem(tree, "note", makeNote({ id: 31 }), null).rootNotes.map(n => n.id)).toEqual([30, 31])
    })

    it("inserts inside a nested folder", () => {
        const tree = sample()
        const next = insertTreeItem(tree, "folder", makeFolder({ id: 4, folderID: 2 }), 2)
        expect(next.rootFolders[0].subfolders[0].subfolders.map(f => f.id)).toEqual([4])
        const withNote = insertTreeItem(tree, "note", makeNote({ id: 21, folderID: 2 }), 2)
        expect(withNote.rootFolders[0].subfolders[0].notes.map(n => n.id)).toEqual([20, 21])
        expect(withNote.rootFolders[1]).toBe(tree.rootFolders[1])
    })

    it("does not insert twice, nor under an unknown folder", () => {
        const tree = sample()
        expect(insertTreeItem(tree, "folder", makeFolder({ id: 1 }), null)).toBe(tree)
        expect(insertTreeItem(tree, "note", makeNote({ id: 99 }), 99)).toBe(tree)
    })
})

describe("remove", () => {
    it("removes root and nested folders and notes", () => {
        const tree = sample()
        expect(removeTreeItem(tree, "folder", 3).rootFolders.map(f => f.id)).toEqual([1])
        expect(removeTreeItem(tree, "folder", 2).rootFolders[0].subfolders).toEqual([])
        expect(removeTreeItem(tree, "note", 30).rootNotes).toEqual([])
        expect(removeTreeItem(tree, "note", 20).rootFolders[0].subfolders[0].notes).toEqual([])
        expect(removeTreeItem(tree, "note", 99)).toBe(tree)
    })
})

describe("colorFolderContent", () => {
    it("colors the folder, its descendants and their notes only", () => {
        const tree = sample()
        const next = colorFolderContent(tree, 1, "#f00")
        const folder = next.rootFolders[0]
        expect(folder.color).toBe("#f00")
        expect(folder.notes[0].color).toBe("#f00")
        expect(folder.subfolders[0].color).toBe("#f00")
        expect(folder.subfolders[0].notes[0].color).toBe("#f00")
        expect(next.rootFolders[1]).toBe(tree.rootFolders[1])
        expect(next.rootNotes).toBe(tree.rootNotes)
    })

    it("clears the colors and ignores an unknown folder", () => {
        const tree = colorFolderContent(sample(), 1, "#f00")
        expect(colorFolderContent(tree, 1, undefined).rootFolders[0].notes[0].color).toBeUndefined()
        expect(colorFolderContent(tree, 99, "#000")).toBe(tree)
    })
})

describe("builders", () => {
    it("builds a folder and a note appended after their siblings, with the database defaults", () => {
        const folder = buildFolder(9, 1, 2, "Nuova", "#abc", [makeFolder({ position: 4 })])
        expect(folder).toMatchObject({ id: 9, workspaceID: 1, folderID: 2, name: "Nuova", color: "#abc", position: 5, subfolders: [], notes: [] })
        expect(folder.creation_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        expect(folder.creation_time).toMatch(/^\d{2}:\d{2}$/)

        const note = buildNote(8, 1, null, "Nota", undefined, [])
        expect(note).toMatchObject({ id: 8, folderID: null, name: "Nota", position: 0, groups: [] })
        expect(note.color).toBeUndefined()
    })
})
