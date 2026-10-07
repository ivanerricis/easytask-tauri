import { describe, expect, it } from "vitest"
import { computeTabMove, computeTabZone, pickTabByX } from "./tab-reorder"

describe("computeTabZone", () => {
    it("splits a tab in before / after", () => {
        expect(computeTabZone({ left: 100, width: 100 }, 120)).toBe("before")
        expect(computeTabZone({ left: 100, width: 100 }, 180)).toBe("after")
    })
})

describe("computeTabMove", () => {
    const ids = [1, 2, 3, 4]
    it("moves forward and backward with the final index", () => {
        expect(computeTabMove(ids, 1, 3, "after")).toEqual({ from: 0, to: 2 })
        expect(computeTabMove(ids, 1, 3, "before")).toEqual({ from: 0, to: 1 })
        expect(computeTabMove(ids, 4, 1, "before")).toEqual({ from: 3, to: 0 })
        expect(computeTabMove(ids, 4, 2, "after")).toEqual({ from: 3, to: 2 })
    })
    it("returns null for no-ops and unknown ids", () => {
        expect(computeTabMove(ids, 2, 2, "before")).toBeNull()
        expect(computeTabMove(ids, 2, 1, "after")).toBeNull()
        expect(computeTabMove(ids, 2, 3, "before")).toBeNull()
        expect(computeTabMove(ids, 9, 1, "before")).toBeNull()
        expect(computeTabMove(ids, 1, 9, "before")).toBeNull()
    })
})

describe("pickTabByX", () => {
    const tabs = [{ id: 1, left: 0, right: 100 }, { id: 2, left: 100, right: 200 }, { id: 3, left: 200, right: 300 }]
    it("picks the tab under the pointer", () => {
        expect(pickTabByX(tabs, 50)).toBe(1)
        expect(pickTabByX(tabs, 250)).toBe(3)
    })
    it("picks the last tab past the end of the bar, and the first one before its start", () => {
        expect(pickTabByX(tabs, 450)).toBe(3)
        expect(pickTabByX(tabs, -40)).toBe(1)
    })
    it("picks the last tab in the gap after the tabs even when they are not in order", () => {
        expect(pickTabByX([...tabs].reverse(), 301)).toBe(3)
    })
    it("picks nothing without tabs", () => {
        expect(pickTabByX([], 10)).toBeNull()
    })
})
