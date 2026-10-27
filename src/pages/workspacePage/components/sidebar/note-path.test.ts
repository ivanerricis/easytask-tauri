import { describe, expect, it } from "vitest"
import type { Folder, Note } from "@/types/types"
import { makeNote } from "@/test/ui-fixtures"
import { getNotePath } from "./note-path"
import type { TreeData } from "./tree-dnd"

const dates = { creation_date: "", creation_time: "", edit_date: "", edit_time: "" }
const folder = (id: number, folderID: number | null, subfolders: Folder[] = [], notes: Note[] = []): Folder => ({
    id, workspaceID: 1, folderID, name: `F${id}`, position: 0, ...dates, subfolders, notes,
})
const note = (id: number, folderID: number | null) => makeNote({ id, folderID, name: `N${id}` })

// root: F1 { F2 { N3 }, N2 }, N1
const tree = (): TreeData => ({
    rootFolders: [folder(1, null, [folder(2, 1, [], [note(3, 2)])], [note(2, 1)])],
    rootNotes: [note(1, null)],
})

describe("getNotePath", () => {
    it("is only the note for a note in the root", () => {
        expect(getNotePath(tree(), 1)).toEqual([{ type: "note", id: 1, name: "N1" }])
    })

    it("lists the folders from the root down, then the note", () => {
        expect(getNotePath(tree(), 3)).toEqual([
            { type: "folder", id: 1, name: "F1" },
            { type: "folder", id: 2, name: "F2" },
            { type: "note", id: 3, name: "N3" },
        ])
    })

    it("is empty when the note is not in the tree", () => {
        expect(getNotePath(tree(), 99)).toEqual([])
    })
})
