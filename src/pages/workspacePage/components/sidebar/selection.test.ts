import { describe, expect, it, vi } from "vitest"
import type { Folder, Note } from "@/types/types"
import { createSelectionStore, getTopMostItems, handleSelectionClick, parseSelectionKey, rowKeys, selectionKey } from "./selection"
import { flattenTree } from "./flat-tree"

const note = (id: number, folderID: number | null = null): Note => ({ id, name: `n${id}`, folderID, workspaceID: 1, position: 0 } as unknown as Note)
const folder = (id: number, folderID: number | null, subfolders: Folder[] = [], notes: Note[] = []): Folder =>
    ({ id, name: `f${id}`, folderID, workspaceID: 1, position: 0, subfolders, notes } as unknown as Folder)

// f1 { f2 { n20 } n10 }, f3 { n30 }, n40
const tree = {
    rootFolders: [
        folder(1, null, [folder(2, 1, [], [note(20, 2)])], [note(10, 1)]),
        folder(3, null, [], [note(30, 3)]),
    ],
    rootNotes: [note(40)],
}
// f1 f2 n20 n10 f3 n30 n40
const keys = (collapsed: number[] = []) => rowKeys(flattenTree(tree, new Set(collapsed)))

const storeWith = (visible = keys()) => {
    const store = createSelectionStore()
    store.sync(visible)
    return store
}
const selected = (store: ReturnType<typeof createSelectionStore>) => [...store.getSelected()].sort()

describe("selection keys", () => {
    it("tells a note from a folder with the same id", () => {
        expect(selectionKey("note", 12)).not.toBe(selectionKey("folder", 12))
        expect(parseSelectionKey(selectionKey("folder", 3))).toEqual({ type: "folder", id: 3 })
        expect(parseSelectionKey("note-x")).toBeNull()
    })
})

describe("selection store", () => {
    it("toggles one item and makes it the anchor", () => {
        const store = storeWith()
        store.toggle("note-10")
        store.toggle("folder-3")
        expect(selected(store)).toEqual(["folder-3", "note-10"])
        expect(store.getAnchor()).toBe("folder-3")
        store.toggle("note-10")
        expect(selected(store)).toEqual(["folder-3"])
    })

    it("selects the visible range from the anchor, in both directions", () => {
        const store = storeWith()
        store.toggle("note-20")
        store.selectRange("folder-3")
        expect(selected(store)).toEqual(["folder-3", "note-10", "note-20"])
        // The anchor stays: the range is recomputed from it
        store.selectRange("folder-2")
        expect(selected(store)).toEqual(["folder-2", "note-20"])
        store.selectRange("folder-1")
        expect(selected(store)).toEqual(["folder-1", "folder-2", "note-20"])
    })

    it("skips the children of collapsed folders in a range", () => {
        const store = storeWith(keys([1]))
        // f1 f3 n30 n40
        store.toggle("folder-1")
        store.selectRange("note-30")
        expect(selected(store)).toEqual(["folder-1", "folder-3", "note-30"])
        expect(store.has("note-10")).toBe(false)
        expect(store.has("folder-2")).toBe(false)
    })

    it("selects only the clicked row when there is no anchor or it is no longer in view", () => {
        const store = storeWith()
        store.selectRange("note-30")
        expect(selected(store)).toEqual(["note-30"])
        expect(store.getAnchor()).toBe("note-30")
        store.reset("note-10")
        store.sync(keys([1]))
        store.selectRange("note-40")
        expect(selected(store)).toEqual(["note-40"])
    })

    it("reset clears the selection and sets the next anchor", () => {
        const store = storeWith()
        store.toggle("note-10")
        store.reset("note-40")
        expect(store.getSelected().size).toBe(0)
        expect(store.getAnchor()).toBe("note-40")
        store.selectRange("note-30")
        expect(selected(store)).toEqual(["note-30", "note-40"])
        store.reset()
        expect(store.getAnchor()).toBeNull()
    })

    it("drops what leaves the view (deleted, moved into a collapsed folder, other workspace) and keeps the rest", () => {
        const store = storeWith()
        store.toggle("note-10")
        store.toggle("note-30")
        store.toggle("note-40")
        store.sync(keys().filter(key => key !== "note-30"))
        expect(selected(store)).toEqual(["note-10", "note-40"])
        // A refresh with the same rows keeps the very same selection
        const before = store.getSelected()
        store.sync(keys().filter(key => key !== "note-30"))
        expect(store.getSelected()).toBe(before)
        store.sync(keys([1]))
        expect(selected(store)).toEqual(["note-40"])
    })

    it("lists the selected items in the order of the rows", () => {
        const store = storeWith()
        store.toggle("note-40")
        store.toggle("folder-3")
        store.toggle("note-20")
        expect(store.getRefs()).toEqual([{ type: "note", id: 20 }, { type: "folder", id: 3 }, { type: "note", id: 40 }])
    })

    it("notifies the subscribers of every change and only of those", () => {
        const store = storeWith()
        const listener = vi.fn()
        const unsubscribe = store.subscribe(listener)
        store.toggle("note-10")
        store.reset()
        expect(listener).toHaveBeenCalledTimes(2)
        store.reset()
        store.sync(keys())
        expect(listener).toHaveBeenCalledTimes(2)
        unsubscribe()
        store.toggle("note-10")
        expect(listener).toHaveBeenCalledTimes(2)
    })
})

describe("getTopMostItems", () => {
    const ref = (type: "note" | "folder", id: number) => ({ type, id })

    it("drops the items inside a selected folder, at any depth", () => {
        const refs = [ref("note", 20), ref("folder", 1), ref("folder", 2), ref("note", 10), ref("note", 30)]
        expect(getTopMostItems(tree, refs)).toEqual([ref("folder", 1), ref("note", 30)])
    })

    it("keeps siblings and unrelated items, in tree order, without duplicates", () => {
        const refs = [ref("note", 40), ref("folder", 3), ref("note", 20), ref("note", 20), ref("note", 10)]
        expect(getTopMostItems(tree, refs)).toEqual([ref("note", 20), ref("note", 10), ref("folder", 3), ref("note", 40)])
    })

    it("does not confuse a note with a folder of the same id", () => {
        const sameId = { rootFolders: [folder(5, null, [], [note(7, 5)])], rootNotes: [note(5)] }
        expect(getTopMostItems(sameId, [ref("note", 5), ref("folder", 5)])).toEqual([ref("folder", 5), ref("note", 5)])
    })

    it("ignores items that are not in the tree", () => {
        expect(getTopMostItems(tree, [ref("note", 99)])).toEqual([])
    })
})

describe("handleSelectionClick", () => {
    const click = (modifiers: { ctrlKey?: boolean, metaKey?: boolean, shiftKey?: boolean } = {}) =>
        ({ ctrlKey: false, metaKey: false, shiftKey: false, ...modifiers })

    it("Ctrl or Cmd+click toggles and is a selection gesture", () => {
        const store = storeWith()
        expect(handleSelectionClick(store, "note-10", click({ ctrlKey: true }))).toBe(true)
        expect(handleSelectionClick(store, "note-30", click({ metaKey: true }))).toBe(true)
        expect(selected(store)).toEqual(["note-10", "note-30"])
        expect(handleSelectionClick(store, "note-10", click({ ctrlKey: true }))).toBe(true)
        expect(selected(store)).toEqual(["note-30"])
    })

    it("Shift+click selects the range and is a selection gesture", () => {
        const store = storeWith()
        handleSelectionClick(store, "folder-1", click({ ctrlKey: true }))
        expect(handleSelectionClick(store, "note-10", click({ shiftKey: true }))).toBe(true)
        expect(selected(store)).toEqual(["folder-1", "folder-2", "note-10", "note-20"])
    })

    it("a plain click is not a gesture: it clears the selection and starts the next range", () => {
        const store = storeWith()
        handleSelectionClick(store, "note-10", click({ ctrlKey: true }))
        handleSelectionClick(store, "note-30", click({ ctrlKey: true }))
        expect(handleSelectionClick(store, "folder-3", click())).toBe(false)
        expect(store.getSelected().size).toBe(0)
        handleSelectionClick(store, "note-40", click({ shiftKey: true }))
        expect(selected(store)).toEqual(["folder-3", "note-30", "note-40"])
    })

    it("does nothing without a selection store", () => {
        expect(handleSelectionClick(null, "note-10", click({ ctrlKey: true }))).toBe(false)
    })
})
