import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { SKELETON_DELAY_MS, useDelayedFlag } from "./use-delayed-flag"

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

describe("useDelayedFlag", () => {
    it("turns true only after the delay, and false at once when the load ends", () => {
        const { result, rerender } = renderHook(({ active }) => useDelayedFlag(active), { initialProps: { active: true } })
        expect(result.current).toBe(false)
        act(() => { vi.advanceTimersByTime(SKELETON_DELAY_MS - 1) })
        expect(result.current).toBe(false)
        act(() => { vi.advanceTimersByTime(1) })
        expect(result.current).toBe(true)
        rerender({ active: false })
        expect(result.current).toBe(false)
    })

    it("never shows for a load faster than the delay", () => {
        const { result, rerender } = renderHook(({ active }) => useDelayedFlag(active), { initialProps: { active: true } })
        act(() => { vi.advanceTimersByTime(SKELETON_DELAY_MS / 2) })
        rerender({ active: false })
        act(() => { vi.advanceTimersByTime(SKELETON_DELAY_MS) })
        expect(result.current).toBe(false)
    })
})
