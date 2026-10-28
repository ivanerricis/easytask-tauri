import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import {
    COMPACT_BREAKPOINT, SIDEBAR_DEFAULT_WIDTH, SIDEBAR_MAX_WIDTH, SIDEBAR_MIN_WIDTH,
    MIN_CONTENT_WIDTH, SIDEBAR_RAIL_WIDTH, minContentWidth, clampSidebarWidth, maxSidebarWidth, noteWidthFor, sidebarsToClose, useCompactLayout, widthForKey,
} from "./sidebar-layout"
import { MIN_PANE_WIDTH } from "./split-layout"

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

describe("sidebarsToClose", () => {
    const bar = (open: boolean, width = SIDEBAR_DEFAULT_WIDTH) => ({ open, width })

    it("leaves two wide sidebars alone when the note fits", () => {
        expect(sidebarsToClose(1600, bar(true, 480), bar(true, 480))).toEqual({ left: false, right: false })
    })

    it("closes the right sidebar first, then the left one, until the note has its minimum width", () => {
        // 1000 px, two 480 px sidebars: the note would be about -50 px
        const both = sidebarsToClose(1000, bar(true, 480), bar(true, 480))
        expect(both.right).toBe(true)
        // with the right one closed the note is 1000 - 90 - 480 = 430: the left one stays
        expect(both.left).toBe(false)
        // narrower: both have to go
        expect(sidebarsToClose(900, bar(true, 480), bar(true, 480))).toEqual({ left: true, right: true })
        // default widths at 901 px: the note would be about 290 px, so the right one closes
        expect(noteWidthFor(901, bar(true), bar(true))).toBeLessThan(MIN_CONTENT_WIDTH)
        expect(sidebarsToClose(901, bar(true), bar(true))).toEqual({ left: false, right: true })
    })

    it("applies the same rule with a single open sidebar and ignores closed ones", () => {
        expect(sidebarsToClose(700, bar(true, 480), bar(false, 480))).toEqual({ left: true, right: false })
        expect(sidebarsToClose(700, bar(false), bar(true, 480))).toEqual({ left: false, right: true })
        expect(sidebarsToClose(300, bar(false), bar(false))).toEqual({ left: false, right: false })
        expect(noteWidthFor(1000, bar(false), bar(false))).toBe(1000 - 2 * SIDEBAR_RAIL_WIDTH)
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


describe("sidebarsToClose with split panes", () => {
    const bar = (open: boolean, width = SIDEBAR_DEFAULT_WIDTH) => ({ open, width })

    it("needs the room of every pane, and keeps the single-pane minimum by default", () => {
        expect(minContentWidth()).toBe(MIN_CONTENT_WIDTH)
        expect(minContentWidth(1)).toBe(MIN_CONTENT_WIDTH)
        expect(minContentWidth(2)).toBe(2 * MIN_PANE_WIDTH)
        expect(minContentWidth(0)).toBe(MIN_CONTENT_WIDTH)
    })

    it("closes sidebars that a single pane would tolerate", () => {
        // 1100 px with the default sidebars: note = 1100 - 90 - 520 = 490
        expect(noteWidthFor(1100, bar(true), bar(true))).toBe(490)
        expect(sidebarsToClose(1100, bar(true), bar(true))).toEqual({ left: false, right: false })
        expect(sidebarsToClose(1100, bar(true), bar(true), 2)).toEqual({ left: false, right: true })
        // 1100 - 90 - 260 = 750 >= 640: the left one stays
        expect(sidebarsToClose(1100, bar(true), bar(true), 1)).toEqual({ left: false, right: false })
    })

    it("closes both when even one sidebar leaves too little room for two panes", () => {
        expect(sidebarsToClose(900, bar(true, 300), bar(true, 300), 2)).toEqual({ left: true, right: true })
    })
})
