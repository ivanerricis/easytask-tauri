import { describe, expect, it } from "vitest"
import { computeTabMove, computeTabZone } from "./tab-reorder"

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
