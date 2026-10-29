import { describe, expect, it } from "vitest"
import { DEFAULT_SPLIT_RATIO, MIN_PANE_WIDTH, clampRatio, ratioForKey } from "./split-layout"

describe("clampRatio", () => {
    it("keeps a ratio that leaves both panes their minimum width", () => {
        expect(clampRatio(0.5, 1000)).toBe(0.5)
        expect(clampRatio(0.4, 1000)).toBe(0.4)
    })

    it("keeps each pane at MIN_PANE_WIDTH at least", () => {
        expect(MIN_PANE_WIDTH).toBe(320)
        expect(clampRatio(0.05, 1000)).toBe(0.32)
        expect(clampRatio(0.99, 1000)).toBe(0.68)
    })

    it("stays in the middle when the container cannot hold two panes", () => {
        expect(clampRatio(0.1, 500)).toBe(0.5)
        expect(clampRatio(0.9, 640)).toBe(0.5)
    })

    it("falls back to a fixed margin without a usable width", () => {
        expect(clampRatio(0, Infinity)).toBe(0.1)
        expect(clampRatio(1, 0)).toBe(0.9)
        expect(clampRatio(0.3, NaN)).toBe(0.3)
    })

    it("gives the default for a ratio that is not a number", () => {
        expect(clampRatio(NaN, 1000)).toBe(DEFAULT_SPLIT_RATIO)
        expect(clampRatio(Infinity, 1000)).toBe(DEFAULT_SPLIT_RATIO)
    })
})

describe("ratioForKey", () => {
    it("moves by 2% with the arrows and by 10% with Shift", () => {
        expect(ratioForKey("ArrowRight", 0.5, 1000, false)).toBe(0.52)
        expect(ratioForKey("ArrowLeft", 0.5, 1000, false)).toBe(0.48)
        expect(ratioForKey("ArrowRight", 0.5, 1000, true)).toBe(0.6)
        expect(ratioForKey("ArrowLeft", 0.5, 1000, true)).toBe(0.4)
    })

    it("never goes past the minimum widths", () => {
        expect(ratioForKey("ArrowLeft", 0.33, 1000, true)).toBe(0.32)
        expect(ratioForKey("ArrowRight", 0.67, 1000, true)).toBe(0.68)
    })

    it("sends Home and End to the extremes", () => {
        expect(ratioForKey("Home", 0.5, 1000, false)).toBe(0.32)
        expect(ratioForKey("End", 0.5, 1000, false)).toBe(0.68)
    })

    it("ignores the other keys", () => {
        expect(ratioForKey("a", 0.5, 1000, false)).toBeNull()
    })
})
