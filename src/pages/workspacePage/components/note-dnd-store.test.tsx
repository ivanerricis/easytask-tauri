import { act, render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { NO_HOVER, NoteDndStoreContext, createNoteDndStore, useNoteDndSelector } from "./note-dnd-state"

describe("note drag store", () => {
    it("tells its listeners only when something really changed", () => {
        const store = createNoteDndStore()
        const listener = vi.fn()
        const unsubscribe = store.subscribe(listener)

        store.set({ hover: NO_HOVER })
        expect(listener).not.toHaveBeenCalled()

        store.set({ active: { kind: "task", id: 1 } })
        expect(listener).toHaveBeenCalledTimes(1)
        expect(store.getState().active).toEqual({ kind: "task", id: 1 })
        // The part not given is kept
        expect(store.getState().hover).toBe(NO_HOVER)

        unsubscribe()
        store.set({ hover: { overKey: "task-2", zone: "after" } })
        expect(listener).toHaveBeenCalledTimes(1)
    })

    it("re-renders a row only when the part of the state it reads changes", () => {
        const store = createNoteDndStore()
        const renders: Record<string, number> = { first: 0, second: 0 }
        const Row = ({ id }: { id: "first" | "second" }) => {
            const zone = useNoteDndSelector(state => state.hover.overKey === `task-${id}` ? state.hover.zone : null)
            renders[id]++
            return <span>{zone ?? "-"}</span>
        }
        const { container } = render(
            <NoteDndStoreContext.Provider value={store}>
                <Row id="first" /><Row id="second" />
            </NoteDndStoreContext.Provider>,
        )
        expect(renders).toEqual({ first: 1, second: 1 })

        act(() => store.set({ hover: { overKey: "task-first", zone: "before" } }))
        expect(renders).toEqual({ first: 2, second: 1 })
        expect(container.textContent).toBe("before-")

        // Moving over the other row updates both (the one left and the one entered), nothing else
        act(() => store.set({ hover: { overKey: "task-second", zone: "after" } }))
        expect(renders).toEqual({ first: 3, second: 2 })
        expect(container.textContent).toBe("-after")

        // The same zone again (a new object) changes nothing for the rows
        act(() => store.set({ hover: { overKey: "task-second", zone: "after" } }))
        expect(renders).toEqual({ first: 3, second: 2 })
    })
})
