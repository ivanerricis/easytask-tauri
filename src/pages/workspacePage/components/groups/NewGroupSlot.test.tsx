import { act, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { NewGroupEnd } from "./NewGroupSlot"
import { NoteDndStoreContext, createNoteDndStore } from "../note-dnd-state"

const setup = () => {
    const store = createNoteDndStore()
    render(
        <NoteDndStoreContext.Provider value={store}>
            <NewGroupEnd index={2}><button>Aggiungi</button></NewGroupEnd>
        </NoteDndStoreContext.Provider>,
    )
    return store
}

describe("NewGroupEnd label", () => {
    it("shows no label until a section is dragged", () => {
        setup()
        expect(screen.queryByText("Nuovo gruppo")).toBeNull()
    })

    it("is centered on the drop area and muted while the section is elsewhere", () => {
        const store = setup()
        act(() => store.set({ active: { kind: "section", id: 1 } }))
        const label = screen.getByText("Nuovo gruppo")
        expect(label).toHaveClass("top-1/2", "-translate-y-1/2")
        expect(label).toHaveClass("text-muted-foreground")
    })

    it("uses the full foreground colour when the drop area is the target", () => {
        const store = setup()
        act(() => store.set({ active: { kind: "section", id: 1 }, hover: { overKey: "new-group-2", zone: "inside" } }))
        const label = screen.getByText("Nuovo gruppo")
        expect(label).toHaveClass("text-foreground")
        expect(label).not.toHaveClass("text-muted-foreground")
    })
})
