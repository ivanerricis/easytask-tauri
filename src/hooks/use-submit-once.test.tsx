import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { useSubmitOnce } from "./use-submit-once"
import { deferred } from "@/test/ui-render"

describe("useSubmitOnce", () => {
    it("ignores calls while the action is pending and reports saving", async () => {
        const { result } = renderHook(() => useSubmitOnce())
        const pending = deferred()
        const action = vi.fn(() => pending.promise)

        let first!: Promise<void>
        act(() => { first = result.current.run(action) })
        await act(async () => { await result.current.run(action) })
        expect(action).toHaveBeenCalledTimes(1)
        expect(result.current.saving).toBe(true)

        await act(async () => { pending.resolve(); await first })
        expect(result.current.saving).toBe(false)
    })

    it("allows a new run after the previous one failed", async () => {
        const { result } = renderHook(() => useSubmitOnce())
        await act(async () => { await result.current.run(() => Promise.reject(new Error("x"))).catch(() => { }) })
        const action = vi.fn().mockResolvedValue(undefined)
        await act(async () => { await result.current.run(action) })
        expect(action).toHaveBeenCalledTimes(1)
    })
})
