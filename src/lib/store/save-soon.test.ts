import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { store } from "./initStore"
import { flushStore, saveStoreSoon } from "./save-soon"

vi.mock("./initStore", () => ({ store: { save: vi.fn() } }))

describe("saveStoreSoon / flushStore", () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.mocked(store.save).mockReset()
        vi.mocked(store.save).mockResolvedValue(undefined)
    })
    afterEach(() => vi.useRealTimers())

    it("coalesces a burst of changes into one save after the debounce", async () => {
        const a = saveStoreSoon()
        const b = saveStoreSoon()
        await vi.advanceTimersByTimeAsync(499)
        expect(store.save).not.toHaveBeenCalled()
        await vi.advanceTimersByTimeAsync(1)
        expect(store.save).toHaveBeenCalledTimes(1)
        await Promise.all([a, b])
    })

    it("flushStore saves immediately and cancels the pending timer", async () => {
        const pending = saveStoreSoon()
        await flushStore()
        await pending
        expect(store.save).toHaveBeenCalledTimes(1)
        await vi.advanceTimersByTimeAsync(1000)
        expect(store.save).toHaveBeenCalledTimes(1)
    })

    it("flushStore does nothing when nothing is pending", async () => {
        await flushStore()
        expect(store.save).not.toHaveBeenCalled()
    })

    it("rejects the waiting callers when the save fails", async () => {
        vi.mocked(store.save).mockRejectedValue(new Error("disk full"))
        const assertion = expect(saveStoreSoon()).rejects.toThrow("disk full")
        await vi.advanceTimersByTimeAsync(500)
        await assertion
    })
})