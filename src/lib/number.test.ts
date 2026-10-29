import { describe, expect, it } from "vitest"
import { clampIndex, clampNumber, isFiniteNumber } from "./number"

describe("isFiniteNumber", () => {
    it("accepts finite numbers only", () => {
        expect([0, -1.5, 3].every(isFiniteNumber)).toBe(true)
        expect([NaN, Infinity, "1", null, undefined].some(isFiniteNumber)).toBe(false)
    })
})

describe("clampNumber", () => {
    it("clamps into the range", () => {
        expect(clampNumber(5, 1, 3, 2)).toBe(3)
        expect(clampNumber(-5, 1, 3, 2)).toBe(1)
        expect(clampNumber(2.5, 1, 3, 2)).toBe(2.5)
    })

    it("gives the fallback for non-finite values", () => {
        for (const value of [NaN, Infinity, "3", null, undefined]) expect(clampNumber(value, 1, 3, 2)).toBe(2)
    })

    it("rounds to the step, clamping first", () => {
        expect(clampNumber(1.234, 0, 2, 1, 0.01)).toBe(1.23)
        expect(clampNumber(0.30000000000000004, 0, 2, 1, 0.01)).toBe(0.3)
        expect(clampNumber(7.6, 0, 10, 1, 1)).toBe(8)
        expect(clampNumber(14, 0, 100, 1, 5)).toBe(15)
        expect(clampNumber(480.7, 224, 480.4, 260, 1)).toBe(480)
    })
})

describe("clampIndex", () => {
    it("keeps the index between 0 and the length", () => {
        expect(clampIndex(-3, 4)).toBe(0)
        expect(clampIndex(9, 4)).toBe(4)
        expect(clampIndex(2, 4)).toBe(2)
    })

    it("truncates fractions and turns NaN into 0", () => {
        expect(clampIndex(2.9, 4)).toBe(2)
        expect(clampIndex(NaN, 4)).toBe(0)
    })
})
