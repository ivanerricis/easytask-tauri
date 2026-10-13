import { act, render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { NO_TREE_HOVER, TreeHoverStoreContext, createTreeHoverStore, useTreeDropZone, useTreeRootActive } from "./tree-row"

describe("tree hover store", () => {
    it("re-renders a row only when its own drop zone changes", () => {
        const store = createTreeHoverStore()
        const renders = { note: 0, folder: 0, root: 0 }
        const Note = () => { const zone = useTreeDropZone("note", 1); renders.note++; return <i>{zone ?? "-"}</i> }
        const Folder = () => { const zone = useTreeDropZone("folder", 2); renders.folder++; return <i>{zone ?? "-"}</i> }
        const Root = () => { const active = useTreeRootActive(); renders.root++; return <i>{active ? "root" : "-"}</i> }
        const { container } = render(
            <TreeHoverStoreContext.Provider value={store}><Note /><Folder /><Root /></TreeHoverStoreContext.Provider>,
        )
        expect(container.textContent).toBe("---")

        act(() => store.set({ overKey: "note-1", zone: "after", rootActive: false }))
        expect(renders).toEqual({ note: 2, folder: 1, root: 1 })
        expect(container.textContent).toBe("after--")

        // The pointer goes to the folder: the note and the folder update, the root area does not
        act(() => store.set({ overKey: "folder-2", zone: "inside", rootActive: false }))
        expect(renders).toEqual({ note: 3, folder: 2, root: 1 })
        expect(container.textContent).toBe("-inside-")

        act(() => store.set({ overKey: null, zone: "inside", rootActive: true }))
        expect(renders).toEqual({ note: 3, folder: 3, root: 2 })
        expect(container.textContent).toBe("--root")

        act(() => store.set(NO_TREE_HOVER))
        expect(container.textContent).toBe("---")
    })

    it("shows nothing without a provider", () => {
        const Note = () => <i>{useTreeDropZone("note", 1) ?? "-"}</i>
        const { container } = render(<Note />)
        expect(container.textContent).toBe("-")
    })
})
