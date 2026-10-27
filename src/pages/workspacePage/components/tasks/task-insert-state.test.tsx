import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { createTaskInsertStore, TaskInsertProvider, useInsertSlot, useTaskInsertStore } from "./task-insert-state"

describe("task insert store", () => {
    it("holds one slot: claiming another replaces it, close empties it", () => {
        const store = createTaskInsertStore()
        const listener = vi.fn()
        store.subscribe(listener)

        store.claim({ listKey: "s1", afterTaskId: 4 })
        store.claim({ listKey: "s2", afterTaskId: null })
        expect(store.getState()).toEqual({ listKey: "s2", afterTaskId: null })
        store.close()
        expect(store.getState()).toBeNull()
        expect(listener).toHaveBeenCalledTimes(3)
    })

    it("the bottom field takes the place of any other and only its own list can release it", () => {
        const store = createTaskInsertStore()
        store.claim({ listKey: "s1", afterTaskId: 4 })
        store.claimEnd("s1")
        expect(store.getState()).toEqual({ listKey: "s1", afterTaskId: null, end: true })
        store.moveAfter(9)
        expect(store.getState()?.end).toBe(true)

        store.releaseEnd("s2")
        expect(store.getState()).not.toBeNull()
        store.claim({ listKey: "s1", afterTaskId: 4 })
        store.releaseEnd("s1")
        expect(store.getState()).toEqual({ listKey: "s1", afterTaskId: 4 })
        store.claimEnd("s1")
        store.releaseEnd("s1")
        expect(store.getState()).toBeNull()
    })

    it("moveAfter keeps the list and changes the task; it does nothing when closed", () => {
        const store = createTaskInsertStore()
        store.moveAfter(9)
        expect(store.getState()).toBeNull()

        store.claim({ listKey: "s1", afterTaskId: 4 })
        store.moveAfter(9)
        expect(store.getState()).toEqual({ listKey: "s1", afterTaskId: 9 })
    })

    it("useInsertSlot returns the slot only to its own list and does not re-render the others", () => {
        const wrapper = ({ children }: { children: React.ReactNode }) => <TaskInsertProvider>{children}</TaskInsertProvider>
        let renders = 0
        const { result } = renderHook(() => {
            renders++
            return { mine: useInsertSlot("s1"), other: useInsertSlot("s2"), store: useTaskInsertStore() }
        }, { wrapper })
        const before = renders

        act(() => result.current.store.claim({ listKey: "s1", afterTaskId: null }))
        expect(result.current.mine).toEqual({ listKey: "s1", afterTaskId: null })
        expect(result.current.other).toBeNull()
        expect(renders).toBe(before + 1)
    })

    it("without a provider the store is inert", () => {
        const { result } = renderHook(() => ({ slot: useInsertSlot("s1"), store: useTaskInsertStore() }))
        act(() => result.current.store.claim({ listKey: "s1", afterTaskId: 1 }))
        expect(result.current.slot).toBeNull()
    })
})

