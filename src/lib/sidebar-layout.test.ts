import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import {
    COMPACT_BREAKPOINT, SIDEBAR_DEFAULT_WIDTH, SIDEBAR_MAX_WIDTH, SIDEBAR_MIN_WIDTH,
    clampSidebarWidth, maxSidebarWidth, useCompactLayout, widthForKey,
} from "./sidebar-layout"

describe("sidebar width helpers", () => {
    it("clamps the width to the allowed range", () => {
        expect(clampSidebarWidth(50)).toBe(SIDEBAR_MIN_WIDTH)
        expect(clampSidebarWidth(9999)).toBe(SIDEBAR_MAX_WIDTH)
        expect(clampSidebarWidth(300.4)).toBe(300)
        expect(clampSidebarWidth(Number.NaN)).toBe(SIDEBAR_DEFAULT_WIDTH)
    })

    it("leaves room to the note in narrow windows but never goes below the minimum", () => {
        expect(maxSidebarWidth(1400)).toBe(SIDEBAR_MAX_WIDTH)
        expect(maxSidebarWidth(800)).toBeLessThan(SIDEBAR_MAX_WIDTH)
        expect(maxSidebarWidth(300)).toBe(SIDEBAR_MIN_WIDTH)
        expect(clampSidebarWidth(480, 800)).toBe(maxSidebarWidth(800))
    })

    it("maps keys to widths", () => {
        expect(widthForKey("ArrowRight", 260, 1400, false)).toBe(276)
        expect(widthForKey("ArrowLeft", 260, 1400, false)).toBe(244)
        expect(widthForKey("ArrowRight", 260, 1400, true)).toBe(324)
        expect(widthForKey("ArrowRight", 260, 1400, false, -1)).toBe(244)
        expect(widthForKey("ArrowLeft", SIDEBAR_MIN_WIDTH, 1400, false)).toBe(SIDEBAR_MIN_WIDTH)
        expect(widthForKey("Home", 300, 1400, false)).toBe(SIDEBAR_MIN_WIDTH)
        expect(widthForKey("End", 300, 1400, false)).toBe(SIDEBAR_MAX_WIDTH)
        expect(widthForKey("a", 300, 1400, false)).toBeNull()
    })
})

describe("useCompactLayout", () => {
    const original = window.innerWidth
    afterEach(() => { window.innerWidth = original })

    it("follows the window width around the breakpoint", () => {
        window.innerWidth = COMPACT_BREAKPOINT + 100
        const { result } = renderHook(() => useCompactLayout())
        expect(result.current).toBe(false)

        act(() => { window.innerWidth = COMPACT_BREAKPOINT - 1; window.dispatchEvent(new Event("resize")) })
        expect(result.current).toBe(true)

        act(() => { window.innerWidth = COMPACT_BREAKPOINT; window.dispatchEvent(new Event("resize")) })
        expect(result.current).toBe(false)
    })
})
