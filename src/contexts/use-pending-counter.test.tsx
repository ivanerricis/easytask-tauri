import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { usePendingCounter } from "./use-pending-counter"

describe("usePendingCounter", () => {
    it("reports the count while operations overlap and returns the result", async () => {
        const onChange = vi.fn()
        const { result } = renderHook(() => usePendingCounter(onChange))
        let resolveA!: (value: string) => void
        let resolveB!: (value: string) => void
        let a!: Promise<string>
        let b!: Promise<string>
        act(() => {
            a = result.current.track(() => new Promise<string>(resolve => { resolveA = resolve }))
            b = result.current.track(() => new Promise<string>(resolve => { resolveB = resolve }))
        })
        expect(result.current.getPending()).toBe(2)
        resolveA("a")
        await expect(a).resolves.toBe("a")
        expect(result.current.getPending()).toBe(1)
        resolveB("b")
        await expect(b).resolves.toBe("b")
        expect(onChange.mock.calls.map(call => call[0])).toEqual([1, 2, 1, 0])
    })

    it("decrements when the operation throws", async () => {
        const onChange = vi.fn()
        const { result } = renderHook(() => usePendingCounter(onChange))
        await expect(result.current.track(async () => { throw new Error("boom") })).rejects.toThrow("boom")
        expect(result.current.getPending()).toBe(0)
        expect(onChange).toHaveBeenLastCalledWith(0)
    })
})
